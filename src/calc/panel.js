/* The calculator panel: shared state, the draggable shell, and tab switching.

   Two calculators live behind one button. The TI-84 (ti84.js) is the real one
   and is tried first; the built-in tabs (builtin.js) are the fallback offered
   when it cannot start. */

import { $ } from "../core/dom.js";
import { el, isNarrow, state } from "../core/state.js";

export const calcState = {
  tab: "home", placed: false, hist: [], ans: 0, deg: false, second: false,
  ys: ["", "", ""], win: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
};

/* A framed page cannot nest a third-party page, so the TI-84 is only offered
   when this app is the top-level document. */
export const EMBEDDED = (() => {
  try { return window.self !== window.top; } catch (e) { return true; }
})();

export function applyCalcShift() {
  // Only meaningful when the question is a single column; a split view has
  // nowhere to slide to.
  const solo = el.paneLeft.hidden && !el.calc.hidden &&
    state.screen === "question" && !isNarrow();
  if (solo) el.paneRight.style.setProperty("--calcw", el.calc.offsetWidth + "px");
  el.paneRight.classList.toggle("calcshift", solo);
}

export function setCalc(open) {
  el.calc.hidden = !open;
  if (!open) el.calc.classList.remove("wide");
  const t = $("tCalc");
  if (t) t.setAttribute("aria-pressed", String(open));
  if (!open) return;
  if (!calcState.placed) {
    calcState.placed = true;
    el.calc.style.top = "96px";
    el.calc.style.left = "14px";   // docked left, so content slides right
  }
  drawCalc();
  applyCalcShift();
}

export function drawCalc() {
  document.querySelectorAll(".calc-tab").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-ctab") === calcState.tab));
  });
  el.calcBody.innerHTML = "";
  if (calcState.tab === "graph") drawGraphTab(); else drawHomeTab();
}

export function wireCalcPanel() {
  el.calcClose.addEventListener("click", () => { setCalc(false); applyCalcShift(); });
  document.querySelectorAll(".calc-tab").forEach((b) => {
    b.addEventListener("click", () => {
      calcState.tab = b.getAttribute("data-ctab");
      drawCalc();
    });
  });

  let on = false, dx = 0, dy = 0;
  el.calcGrip.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const r = el.calc.getBoundingClientRect();
    el.calc.style.left = r.left + "px";
    el.calc.style.top = r.top + "px";
    on = true;
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    el.calc.classList.add("dragging");
    el.calcGrip.setPointerCapture(e.pointerId);
  });
  el.calcGrip.addEventListener("pointermove", (e) => {
    if (!on) return;
    el.calc.style.left = Math.min(Math.max(-el.calc.offsetWidth + 70, e.clientX - dx), window.innerWidth - 70) + "px";
    el.calc.style.top = Math.min(Math.max(0, e.clientY - dy), window.innerHeight - 40) + "px";
  });
  const stop = (e) => {
    on = false;
    el.calc.classList.remove("dragging");
    applyCalcShift();
    try { el.calcGrip.releasePointerCapture(e.pointerId); } catch (x) { /* released */ }
  };
  el.calcGrip.addEventListener("pointerup", stop);
  el.calcGrip.addEventListener("pointercancel", stop);
}

/* Re-exported so callers need one import for "the calculator" rather than
   knowing which of the two implementations they want. */
export { setTI, tiState } from "./ti84.js";

// Imported last: builtin.js reads calcState from this module.
import { drawGraphTab, drawHomeTab } from "./builtin.js";
