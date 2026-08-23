/* The line reader: a band you can drag anywhere, full page width by default on
   a single-column question and half width beside a split view, with a stepped
   height control whose chevron flips at each end of the range. */

import { el, isNarrow, state } from "../core/state.js";

const reader = { on: false, x: 0, y: 240, w: 0, h: 76, step: 0, dir: 1, half: false };
const READER_BASE = 76;
const READER_STEPS = 2;   // 0 = default, 1 = +50%, 2 = +100%

export function setReader(on) {
  reader.on = on;
  state.reader.on = on;
  el.reader.hidden = !on;
  if (!on) return;
  reader.half = !el.paneLeft.hidden && !isNarrow();   // narrow is one column
  reader.w = reader.half ? Math.round(window.innerWidth * 0.5) : window.innerWidth;
  reader.x = reader.half ? Math.round(window.innerWidth * 0.25) : 0;
  reader.step = 0;
  reader.dir = 1;
  reader.h = READER_BASE;
  el.readerStep.classList.remove("flipped");
  paintReader();
}

export function paintReader() {
  const x = Math.round(reader.x), y = Math.round(reader.y);
  const w = Math.round(reader.w), h = Math.round(reader.h);
  el.slit.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px";
  el.shTop.style.cssText = "left:0;right:0;top:0;height:" + y + "px";
  el.shBot.style.cssText = "left:0;right:0;top:" + (y + h) + "px;bottom:0";
  el.shLeft.style.cssText = "left:0;width:" + x + "px;top:" + y + "px;height:" + h + "px";
  el.shRight.style.cssText = "left:" + (x + w) + "px;right:0;top:" + y + "px;height:" + h + "px";
  el.readerBar.style.cssText = "left:" + x + "px;top:" + (y - 34) + "px;width:" + w + "px";
  el.readerFoot.style.cssText = "left:" + x + "px;top:" + (y + h) + "px;width:" + w + "px";
}

export function wireReader() {
  el.readerOff.addEventListener("click", () => setReader(false));

  el.readerWidth.addEventListener("click", () => {
    reader.half = !reader.half;
    const full = window.innerWidth;
    reader.w = reader.half ? Math.round(full * 0.5) : full;
    reader.x = Math.min(Math.max(0, reader.x), full - reader.w);
    if (!reader.half) reader.x = 0;
    paintReader();
  });

  // Each press steps the height. At the top of the range the chevron flips and
  // the presses walk it back down, then it flips again.
  el.readerStep.addEventListener("click", () => {
    reader.step += reader.dir;
    if (reader.step >= READER_STEPS) { reader.step = READER_STEPS; reader.dir = -1; }
    else if (reader.step <= 0) { reader.step = 0; reader.dir = 1; }
    el.readerStep.classList.toggle("flipped", reader.dir === -1);
    reader.h = Math.round(READER_BASE * (1 + 0.5 * reader.step));
    reader.y = Math.min(reader.y, window.innerHeight - reader.h - 4);
    paintReader();
  });

  let on = false, dx = 0, dy = 0;
  const begin = (e) => {
    if (e.target.closest("button")) return;
    on = true;
    dx = e.clientX - reader.x;
    dy = e.clientY - reader.y;
    el.reader.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  el.readerGrip.addEventListener("pointerdown", begin);
  el.slit.addEventListener("pointerdown", begin);
  el.reader.addEventListener("pointermove", (e) => {
    if (!on) return;
    reader.x = Math.min(Math.max(-reader.w + 80, e.clientX - dx), window.innerWidth - 80);
    reader.y = Math.min(Math.max(36, e.clientY - dy), window.innerHeight - reader.h - 4);
    paintReader();
  });
  const stop = (e) => {
    on = false;
    try { el.reader.releasePointerCapture(e.pointerId); } catch (x) { /* already released */ }
  };
  el.reader.addEventListener("pointerup", stop);
  el.reader.addEventListener("pointercancel", stop);

  window.addEventListener("resize", () => { if (reader.on) paintReader(); });
}

export function readerOn() { return reader.on; }
