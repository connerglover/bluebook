/* The draggable divider between the passage pane and the question pane. */

import { el, state } from "../core/state.js";

export function applySplit() {
  el.paneLeft.style.flex = "0 0 " + (state.splitRatio * 100) + "%";
}

export function wireSplit() {
  let on = false;
  el.divider.addEventListener("pointerdown", (e) => {
    on = true;
    el.divider.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  el.divider.addEventListener("pointermove", (e) => {
    if (!on) return;
    const r = el.split.getBoundingClientRect();
    state.splitRatio = Math.min(0.78, Math.max(0.22, (e.clientX - r.left) / r.width));
    applySplit();
  });
  const stop = (e) => {
    if (!on) return;
    on = false;
    try { el.divider.releasePointerCapture(e.pointerId); } catch (x) { /* already released */ }
  };
  el.divider.addEventListener("pointerup", stop);
  el.divider.addEventListener("pointercancel", stop);
}
