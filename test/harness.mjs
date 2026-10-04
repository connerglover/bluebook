/* Boots the real application inside jsdom.

   The old suites loaded the single-file shell and let its IIFE run. The app is
   ES modules now, so instead this builds the DOM from index.html, installs the
   browser globals the modules expect, and imports them for real. Nothing is
   stubbed except the things jsdom genuinely lacks.

   WHAT THIS CAN AND CANNOT SEE, unchanged from before:

   - Logic, DOM structure, state transitions, scoring, the results file → covered.
   - Computed geometry → NOT covered. jsdom has no layout engine, so
     getBoundingClientRect returns zeros and there is no canvas 2D context.
     A passing test here never means something is positioned correctly. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { webcrypto } from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");

export function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", name), "utf8"));
}

/**
 * Create a jsdom window running index.html's markup, install globals, and
 * import the app modules against it.
 *
 * Returns the module namespaces plus the window/document, so a suite can both
 * call functions directly and inspect what they did to the DOM.
 */
export async function boot({ narrow = false, url = "https://practice.test/" } = {}) {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
    // jsdom would try to fetch these; nothing here needs them.
    .replace(/<link[^>]*href="https:\/\/[^"]*"[^>]*>/g, "")
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "");

  const dom = new JSDOM(html, {
    url,
    pretendToBeVisual: true,
  });
  const { window } = dom;

  /* matchMedia is not implemented by jsdom, and the app reads it at import
     time to decide the narrow breakpoint. An unguarded call here would take
     the whole app down before the first question — which is exactly the bug
     the guard in state.js exists to prevent, so it is worth exercising both
     paths across suites. */
  window.matchMedia = (q) => ({
    matches: narrow && /max-width/.test(q),
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  if (narrow) Object.defineProperty(window, "innerWidth", { value: 700, configurable: true });

  // SubtleCrypto, for the answer-key hashing.
  if (!window.crypto || !window.crypto.subtle) {
    Object.defineProperty(window, "crypto", { value: webcrypto, configurable: true });
  }

  // jsdom has no layout; give the pointer-capture calls something to hit.
  window.Element.prototype.setPointerCapture = function () {};
  window.Element.prototype.releasePointerCapture = function () {};
  window.Element.prototype.scrollIntoView = function () {};
  window.HTMLCanvasElement.prototype.getContext = () => null;

  // A localStorage that actually persists for the life of the window.
  const store = new Map();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    },
  });

  installGlobals(window);

  /* NO cache-busting query string here. The modules import each other by
     plain specifier, so a busted URL would create a SECOND copy of the graph:
     the `state` this file holds would not be the `state` dialogs.js wired
     itself against, and every el.* lookup would come back undefined.

     The consequence is that one process boots the app once. run.sh therefore
     runs each suite in its own node process, which is what the old suites did
     anyway. */
  const load = (p) => import(new URL("../src/" + p, import.meta.url).href);

  const [state, clock, answers, screens, question, nav, render, figure,
    hashMod, score, bbresult, describe, validate, loadMod, store2, evalMod] =
    await Promise.all([
      load("core/state.js"), load("core/clock.js"), load("core/answers.js"),
      load("ui/screens.js"), load("ui/question.js"), load("ui/nav.js"),
      load("render/index.js"), load("render/figure.js"),
      load("scoring/hash.js"), load("scoring/score.js"),
      load("results/bbresult.js"), load("results/describe.js"),
      load("loader/validate.js"), load("loader/load.js"),
      load("persist/store.js"), load("calc/eval.js"),
    ]);

  const [dialogs, toolbar, highlight, reader, keyboard, split, mathMod, calcPanel, ti] =
    await Promise.all([
      load("ui/dialogs.js"), load("ui/toolbar.js"), load("ui/highlight.js"),
      load("ui/reader.js"), load("ui/keyboard.js"), load("ui/split.js"),
      load("render/math.js"), load("calc/panel.js"), load("calc/ti84.js"),
    ]);

  const api = {
    dom, window, doc: window.document,
    state, clock, answers, screens, question, nav, render, figure,
    hash: hashMod, score, bbresult, describe, validate, load: loadMod,
    store: store2, evalMod, dialogs, toolbar, highlight, reader, keyboard,
    split, math: mathMod, calc: calcPanel, ti,
    localStore: store,
  };

  api.wire = () => {
    state.cacheElements();
    dialogs.wireDialogs();
    toolbar.wireToolbar();
    nav.wireNav();
    question.wireQuestionScreen();
    highlight.wireHighlights();
    reader.wireReader();
    keyboard.wireKeyboard();
    split.wireSplit();
    clock.wireClock();
    mathMod.wireMath();
    calcPanel.wireCalcPanel();
    ti.wireTI();
    clock.setClockHooks({ onFinish: () => screens.go("done") });
  };

  /** Load a test object and land on the intro screen, as startExam does. */
  api.start = (data, name = "Tester", fileName = "fixture.bbtest") => {
    state.buildModel(data, fileName);
    state.meta.testerName = name;
    state.resetProgress();
    clock.initClocks();
    question.invalidateLeftPane();
    state.applyNarrowClass();
    api.wire();
    state.el.app.hidden = false;
    state.el.signin.hidden = true;
    screens.go("intro");
  };

  /** Start the test proper, skipping the intro screen's button. */
  api.begin = () => {
    state.state.started = true;
    state.state.startedAt = Date.now();
    state.state.i = 0;
    screens.go("question");
  };

  return api;
}

/* The app modules assume a browser. Point the globals at this window so that a
   bare `document` or `window` inside a module resolves correctly. */
function installGlobals(window) {
  const names = [
    "window", "document", "navigator", "location", "history",
    "HTMLElement", "Element", "Node", "Event", "CustomEvent", "MouseEvent",
    "KeyboardEvent", "DOMParser", "XMLSerializer", "NodeFilter", "Range",
    "getSelection", "customElements", "Blob", "File", "FileReader", "URL",
    "requestAnimationFrame", "cancelAnimationFrame", "CSS", "DataTransfer",
    "HTMLCanvasElement", "localStorage", "matchMedia", "crypto", "TextEncoder",
  ];
  for (const n of names) {
    const v = window[n];
    if (v === undefined) continue;
    Object.defineProperty(globalThis, n, {
      configurable: true,
      writable: true,
      value: typeof v === "function" && /^(getSelection|matchMedia|requestAnimationFrame|cancelAnimationFrame)$/.test(n)
        ? v.bind(window)
        : v,
    });
  }
  if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder;
  if (!globalThis.crypto || !globalThis.crypto.subtle) globalThis.crypto = webcrypto;
}
