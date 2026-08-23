/* Entry point.

   Boot order matters: cache the DOM, wire the sign-in screen, and stop. The
   exam engine is only started once a test file has actually been loaded, so a
   visitor who never picks a file pays for none of it. */

import "./styles/index.css";

import { applyNarrowClass, buildModel, cacheElements, el, meta, resetProgress, state, NARROW } from "./core/state.js";
import { initClocks, setClockHooks, syncClock, wireClock } from "./core/clock.js";
import { typeset } from "./core/typeset.js";

import { wireDialogs } from "./ui/dialogs.js";
import { buildTools, setToolbarHooks, wireToolbar } from "./ui/toolbar.js";
import { wireNav } from "./ui/nav.js";
import { drawQuestion, invalidateLeftPane, wireQuestionScreen } from "./ui/question.js";
import { go, render } from "./ui/screens.js";
import { wireHighlights } from "./ui/highlight.js";
import { wireReader } from "./ui/reader.js";
import { wireKeyboard } from "./ui/keyboard.js";
import { wireSplit } from "./ui/split.js";
import { setMathHooks, wireMath } from "./render/math.js";

import { drawCalc, setCalc, wireCalcPanel, calcState } from "./calc/panel.js";
import { setTI, setTiHooks, wireTI } from "./calc/ti84.js";

import { initSignin, hideSignin } from "./signin/signin.js";
import * as store from "./persist/store.js";

let engineWired = false;

/** Attach every listener that lives on document/window. Runs once. */
function wireEngine() {
  if (engineWired) return;
  engineWired = true;

  wireDialogs();
  wireToolbar();
  wireNav();
  wireQuestionScreen();
  wireHighlights();
  wireReader();
  wireKeyboard();
  wireSplit();
  wireClock();
  wireMath();
  wireCalcPanel();
  wireTI();

  setClockHooks({
    onFinish: () => go("done"),
    onTick: () => store.touch(),
  });

  setToolbarHooks({
    onRestart: () => {
      store.clear();
      invalidateLeftPane();
    },
  });

  setMathHooks({
    onReady: () => { if (state.screen === "question") drawQuestion(); },
  });

  setTiHooks({
    onFallback: () => {
      setTI(false);
      calcState.tab = "home";
      setCalc(true);
      buildTools();
    },
  });

  /* Any interaction can change an answer; the store only writes when something
     actually changed, so a broad net here is cheap. */
  ["click", "input", "change", "keyup"].forEach((evt) => {
    document.addEventListener(evt, () => store.touch(), true);
  });

  try {
    if (NARROW) {
      NARROW.addEventListener("change", () => {
        applyNarrowClass();
        if (state.screen === "question") drawQuestion();
        buildTools();
      });
    }
  } catch (e) { /* older engines: the class is set once and that is enough */ }

  window.addEventListener("resize", () => { if (!el.calc.hidden) drawCalc(); });
}

/** Hand a loaded test to the engine and show it. */
function startExam({ data, fileName, name, resume }) {
  buildModel(data, fileName);
  meta.testerName = name || meta.testerName || "Tester";

  resetProgress();
  initClocks();

  if (resume) {
    store.restore(resume);
    meta.testerName = name || resume.testerName || meta.testerName;
    initClocks();                       // re-derive budgets around restored left
  }

  invalidateLeftPane();
  applyNarrowClass();
  wireEngine();

  hideSignin();
  el.app.hidden = false;

  store.startAutosave(2000);

  if (resume && resume.progress && resume.progress.started) {
    go(state.screen === "question" ? "question" : state.screen);
  } else {
    go("intro");
  }

  syncClock();
  typeset(document.body);
}

function boot() {
  cacheElements();
  document.body.classList.add("on-signin");
  applyNarrowClass();
  initSignin(startExam);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

/* A small handle for the test suites and for debugging. It exposes state, not
   answers — there is nothing here a devtools console could not already read. */
window.__app = { state, meta, go, render, startExam, store };
