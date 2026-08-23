/* The top-bar tool strip, the More menu, zoom, the reference panel, breaks and
   the restart flow. */

import { $, esc } from "../core/dom.js";
import { ICON } from "../core/icons.js";
import { typeset } from "../core/typeset.js";
import { SECTIONS, curSec, el, isNarrow, meta, state } from "../core/state.js";
import { fmtClock, stopClock, syncClock } from "../core/clock.js";
import {
  accordionHTML, ask, openAT, openHelp, setAllAccordions, wireAccordion,
} from "./dialogs.js";
import { setCalc, setTI, tiState } from "../calc/panel.js";
import { setReader } from "./reader.js";
import { openHlList, openNotes } from "./highlight.js";
import { openKbd } from "./keyboard.js";
import { go } from "./screens.js";

let moreMenu = null;

export function buildTools() {
  const sec = curSec();
  const showTools = state.screen === "question" || state.screen === "review";
  el.tools.innerHTML = "";
  if (!showTools) return;

  const add = (id, icon, label, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tool"; b.id = id;
    b.innerHTML = '<span class="ic">' + icon + "</span><span>" + label + "</span>";
    b.addEventListener("click", fn);
    el.tools.appendChild(b);
    return b;
  };

  // A narrow top bar cannot carry four labelled tools without eating the
  // question, so they move into the one menu.
  if (isNarrow()) {
    add("tMore", ICON.more, "Tools", toggleMore);
    return;
  }
  add("tHl", ICON.pen, "Highlights & Notes", openHlList);
  if (sec && sec.calculator) {
    const b = add("tCalc", ICON.calc, "Calculator", () => {
      // The built-in calculators are the fallback, offered only when the
      // TI-84 could not start.
      if (tiState.available) setTI(el.tiShell.hidden);
      else setCalc(el.calc.hidden);
    });
    b.setAttribute("aria-pressed", String(!el.calc.hidden || !el.tiShell.hidden));
  }
  // Reference is only offered when the course supplies one. Plenty of courses
  // (AP Calculus among them) sit an exam with no formula sheet.
  if (hasReference()) {
    const b = add("tRef", ICON.ref, "Reference", () => setRef(el.refPanel.hidden));
    b.setAttribute("aria-pressed", String(!el.refPanel.hidden));
  }
  add("tMore", ICON.more, "More", toggleMore);
}

export function toggleMore() {
  if (moreMenu) { moreMenu.remove(); moreMenu = null; return; }
  const anchor = $("tMore").getBoundingClientRect();
  moreMenu = document.createElement("div");
  moreMenu.className = "moremenu";
  moreMenu.setAttribute("role", "menu");
  const sec = curSec();
  const items = [];
  if (isNarrow()) {
    items.push([ICON.pen, "Highlights & Notes", openHlList]);
    if (sec && sec.calculator) {
      items.push([ICON.calc, "Calculator", () => {
        if (tiState.available) setTI(el.tiShell.hidden); else setCalc(el.calc.hidden);
      }]);
    }
    if (hasReference()) items.push([ICON.ref, "Reference", () => setRef(el.refPanel.hidden)]);
    items.push(null);
  }
  items.push(
    [ICON.help, "Help", openHelp],
    [ICON.kbd, "Shortcuts", openKbd],
    [ICON.at, "Assistive Technology", openAT],
    [ICON.lines, "Line Reader", () => setReader(!state.reader.on)],
    [ICON.walk, "Unscheduled Break", startBreak],
    [ICON.restart, "Restart the Exam", restartExam],
  );
  items.forEach((it) => {
    if (!it) {
      const hr = document.createElement("div");
      hr.style.cssText = "height:1px;background:#e6e6e6;margin:6px 10px";
      moreMenu.appendChild(hr);
      return;
    }
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "menuitem");
    b.innerHTML = '<span class="mi">' + it[0] + "</span><span>" + it[1] + "</span>";
    b.addEventListener("click", () => { closeMore(); it[2](); });
    moreMenu.appendChild(b);
  });
  document.body.appendChild(moreMenu);
  const w = moreMenu.offsetWidth || 266;
  moreMenu.style.left = Math.max(10, Math.min(window.innerWidth - w - 10, anchor.right - w + 20)) + "px";
  moreMenu.style.top = (anchor.bottom + 6) + "px";
}

export function closeMore() {
  if (moreMenu) { moreMenu.remove(); moreMenu = null; }
}

export function startBreak() {
  state.breakLeft = 600;
  el.breakScreen.hidden = false;
  syncClock();
  const paint = () => { el.breakClock.textContent = fmtClock(state.breakLeft); };
  paint();
  state.breakTicker = setInterval(() => {
    state.breakLeft -= 1;
    if (state.breakLeft <= 0) { endBreak(); return; }
    paint();
  }, 1000);
}

export function endBreak() {
  if (state.breakTicker) { clearInterval(state.breakTicker); state.breakTicker = null; }
  el.breakScreen.hidden = true;
  syncClock();
}

/* Set by main.js so restarting can also clear saved progress without this
   module importing the persistence layer. */
const hooks = { onRestart: null };
export function setToolbarHooks(h) { Object.assign(hooks, h); }

export function restartExam() {
  ask("Restart the exam?",
    "Every answer, highlight, note and section clock is cleared and you go back to the opening screen. This cannot be undone.",
    "Restart", "Keep testing").then((yes) => {
    if (!yes) return;
    stopClock();
    state.answers = {}; state.marked = {}; state.issues = {}; state.struck = {};
    state.hl = {}; state.hlNotes = {};
    state.i = 0; state.spent = 0; state.started = false;
    state.elim = false; state.issueOpen = false;
    state.layout = "paged"; state.page = "stim";
    state.score = null;
    SECTIONS.forEach((sec) => {
      sec.left = sec.budget;
      sec.used = 0;
      sec.expired = sec.budget === 0;
    });
    setCalc(false); setTI(false); setRef(false); setReader(false); openNotes(false);
    el.alertBanner.hidden = true;
    el.timeScrim.hidden = true;
    if (hooks.onRestart) hooks.onRestart();
    go("intro");
  });
}

export function setZoom(z) {
  state.zoom = Math.min(2, Math.max(0.7, Math.round(z * 10) / 10));
  document.documentElement.style.setProperty("--zoom", state.zoom);
}

/* meta.reference may be a plain HTML string or an array of { title, html }
   sections; the array renders as an accordion. */
export function hasReference() {
  const r = meta.reference;
  return !!(r && (Array.isArray(r) ? r.length : String(r).trim()));
}

export function setRef(open) {
  el.refPanel.hidden = !open;
  const t = $("tRef");
  if (t) t.setAttribute("aria-pressed", String(open));
  if (!open) return;
  const r = meta.reference;
  const items = Array.isArray(r)
    ? r.map((x) => [esc(x.title || "Reference"), x.html || ""])
    : [["Reference", String(r)]];
  el.refBody.innerHTML = accordionHTML(items, items.length === 1);
  typeset(el.refBody);
}

export function wireToolbar() {
  document.addEventListener("click", (e) => {
    if (moreMenu && !moreMenu.contains(e.target) && !e.target.closest("#tMore")) closeMore();
  });
  el.refClose.addEventListener("click", () => setRef(false));
  el.refWide.addEventListener("click", () => el.refPanel.classList.toggle("wide"));
  el.refExpand.addEventListener("click", () => setAllAccordions(el.refBody, true));
  el.refCollapse.addEventListener("click", () => setAllAccordions(el.refBody, false));
  wireAccordion(el.refBody);
  el.breakResume.addEventListener("click", endBreak);
}
