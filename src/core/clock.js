/* Section clocks.

   Every section owns its own remaining budget, and exactly one function decides
   whether anything is counting: clockRunning(). The clock runs only while you
   are sitting on a question in that section, with no break or time-up notice
   over the top. Every screen change just calls syncClock() and re-asks.

   Do NOT reintroduce per-callsite start/stop. Two separate freeze/reset bugs in
   this project's history came from exactly that. */

import { ICON } from "./icons.js";
import { SECTIONS, curSec, el, state } from "./state.js";

const clock = { ticker: null, visible: true, last: 0 };

export function initClocks() {
  SECTIONS.forEach((sec) => {
    sec.budget = Math.round((sec.timeLimitMinutes || 0) * 60);
    if (typeof sec.left !== "number") sec.left = sec.budget;
    sec.used = sec.used || 0;
    sec.expired = sec.budget === 0 ? true : sec.left <= 0;
  });
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  const p = (n) => (n < 10 ? "0" + n : String(n));
  return (h ? h + ":" + p(m) : String(m)) + ":" + p(x);
}

/** The single source of truth for "is time passing right now". */
export function clockRunning() {
  const sec = curSec();
  return !!(state.started && state.timerOn && sec && sec.budget > 0 && !sec.expired &&
    state.screen === "question" && el.breakScreen.hidden && el.timeScrim.hidden);
}

/* Set by the app at boot so the clock can hand off without importing the
   screen module (which imports the clock). */
const hooks = { onTimeUp: null, onFinish: null, onTick: null };
export function setClockHooks(h) { Object.assign(hooks, h); }

function tick() {
  const now = Date.now();
  const dt = Math.max(0, (now - clock.last) / 1000);
  clock.last = now;
  const sec = curSec();
  if (!sec) return;
  const before = sec.left;
  sec.left = Math.max(0, sec.left - dt);
  const spent = before - sec.left;
  state.spent += spent;
  sec.used = (sec.used || 0) + spent;
  if (Math.floor(before) !== Math.floor(sec.left)) {
    paintClock();
    if (hooks.onTick) hooks.onTick();
  }
  if (sec.left <= 0 && !sec.expired) {
    sec.expired = true;
    syncClock();
    timeUp();
  }
}

/** Called after anything that could change whether the clock should run. */
export function syncClock() {
  const run = clockRunning();
  if (run && !clock.ticker) {
    clock.last = Date.now();
    clock.ticker = setInterval(tick, 250);
  } else if (!run && clock.ticker) {
    tick();                                  // bank the final partial second
    clearInterval(clock.ticker);
    clock.ticker = null;
  }
  paintClock();
}

export function paintClock() {
  const sec = curSec();
  const show = state.started && state.timerOn && sec && sec.budget > 0 &&
    (state.screen === "question" || state.screen === "between");
  el.clockWrap.hidden = !show;
  if (!show) return;
  const left = Math.max(0, Math.round(sec.left));
  if (clock.visible) {
    el.clock.textContent = fmtClock(left);
    el.clock.classList.toggle("low", left <= 300 && left > 0);
    el.clockToggle.textContent = "Hide";
  } else {
    el.clock.innerHTML = ICON.stopwatch;
    el.clock.classList.remove("low");
    el.clockToggle.textContent = "Show";
  }
}

function timeUp() {
  paintClock();
  el.timeScrim.hidden = false;
  el.timeStay.focus();
  if (hooks.onTimeUp) hooks.onTimeUp();
}

export function elapsedSeconds() { return state.spent; }

/* The Hide/Show state of the numbers. The keyboard shortcut used to flip a
   different variable (state.clockVisible) than the one paintClock reads, so
   Ctrl+Alt+T silently did nothing; both paths go through here now. */
export function toggleClockVisible() {
  clock.visible = !clock.visible;
  state.clockVisible = clock.visible;
  paintClock();
}

export function wireClock() {
  el.clockToggle.addEventListener("click", toggleClockVisible);
  el.timeStay.addEventListener("click", () => {
    el.timeScrim.hidden = true;
    syncClock();
  });
  el.timeFinish.addEventListener("click", () => {
    el.timeScrim.hidden = true;
    if (hooks.onFinish) hooks.onFinish();
  });
}

/** Stop the ticker outright — used when tearing the exam down. */
export function stopClock() {
  if (clock.ticker) { clearInterval(clock.ticker); clock.ticker = null; }
}
