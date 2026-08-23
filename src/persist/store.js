/* Saved progress.

   A hosted page can be closed, refreshed, or killed by a flat battery, and the
   old single-file runtime lost everything when that happened. Answers,
   highlights, notes, marks, the current question and each section's remaining
   time are written to localStorage as you work, and the sign-in screen offers
   to resume.

   Two rules keep this honest:

   - Only ONE test is held at a time. Loading a different test replaces the
     saved slot rather than accumulating a drawer of half-finished exams.
   - Remaining time is stored as seconds left, not as a deadline. Reloading
     therefore neither gives time back nor takes it away — you resume with what
     you had. The cost is up to a couple of seconds lost in a hard crash, which
     is the right side to err on.

   Every localStorage call is guarded: Safari in private mode throws on setItem,
   and an exception here must never take the exam down. */

import { SECTIONS, meta, source, state } from "../core/state.js";

const KEY = "bluebook:progress:v1";
const NAME_KEY = "bluebook:tester";
const SAVE_FORMAT = 1;

function safeGet(k) {
  try { return window.localStorage.getItem(k); } catch (e) { return null; }
}
function safeSet(k, v) {
  try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; }
}
function safeRemove(k) {
  try { window.localStorage.removeItem(k); } catch (e) { /* nothing to do */ }
}

/* ---------- the tester's name ---------- */

export function savedName() {
  return safeGet(NAME_KEY) || "";
}

export function saveName(name) {
  const clean = String(name || "").trim().slice(0, 60);
  if (clean) safeSet(NAME_KEY, clean);
  return clean;
}

/* ---------- in-progress test ---------- */

export function snapshot() {
  return {
    format: SAVE_FORMAT,
    savedAt: Date.now(),
    testId: source.testId,
    fileName: source.fileName,
    title: meta.title || "",
    course: meta.course || "",
    testerName: meta.testerName || "",
    /* The whole test travels with the snapshot. Resuming must not depend on
       the person still having the .bbtest file to hand — that is exactly the
       situation resume exists for. */
    test: source.data,
    progress: {
      screen: state.screen,
      i: state.i,
      started: state.started,
      answers: state.answers,
      marked: state.marked,
      issues: state.issues,
      struck: state.struck,
      hl: state.hl,
      hlNotes: state.hlNotes,
      elim: state.elim,
      zoom: state.zoom,
      timerOn: state.timerOn,
      layout: state.layout,
      page: state.page,
      splitRatio: state.splitRatio,
      startedAt: state.startedAt,
      spent: state.spent,
    },
    clocks: SECTIONS.map((s) => ({ left: s.left, used: s.used || 0, expired: !!s.expired })),
  };
}

export function save() {
  if (!source.testId || !state.started) return false;
  return safeSet(KEY, JSON.stringify(snapshot()));
}

export function load() {
  const raw = safeGet(KEY);
  if (!raw) return null;
  try {
    const snap = JSON.parse(raw);
    if (!snap || snap.format !== SAVE_FORMAT || !snap.test) return null;
    return snap;
  } catch (e) {
    return null;                 // a corrupt slot is the same as no slot
  }
}

export function clear() { safeRemove(KEY); }

/** Apply a snapshot's progress over an already-built model. */
export function restore(snap) {
  const p = snap.progress || {};
  state.screen = p.screen === "done" ? "review" : (p.screen || "question");
  state.i = typeof p.i === "number" ? p.i : 0;
  state.started = !!p.started;
  state.answers = p.answers || {};
  state.marked = p.marked || {};
  state.issues = p.issues || {};
  state.struck = p.struck || {};
  state.hl = p.hl || {};
  state.hlNotes = p.hlNotes || {};
  state.elim = !!p.elim;
  state.zoom = p.zoom || 1;
  state.timerOn = p.timerOn !== false;
  state.layout = p.layout || "paged";
  state.page = p.page || "stim";
  state.splitRatio = p.splitRatio || 0.5;
  state.startedAt = p.startedAt || null;
  state.spent = p.spent || 0;
  state.score = null;

  (snap.clocks || []).forEach((c, i) => {
    const sec = SECTIONS[i];
    if (!sec) return;
    if (typeof c.left === "number") sec.left = c.left;
    sec.used = c.used || 0;
    sec.expired = !!c.expired;
  });

  if (state.i >= 0 && state.i < 1e6) {
    // A saved index past the end of a re-authored test would leave cur()
    // undefined and blank the screen.
    const max = (snap.test.sections || []).reduce((n, s) => n + ((s.questions || []).length), 0);
    if (state.i >= max) state.i = Math.max(0, max - 1);
  }
}

/* A short human description for the resume button on the sign-in screen. */
export function describeSnapshot(snap) {
  if (!snap) return "";
  const when = new Date(snap.savedAt || Date.now());
  const answered = Object.keys((snap.progress || {}).answers || {}).length;
  const ago = Date.now() - when.getTime();
  const rel = ago < 6e4 ? "just now"
    : ago < 36e5 ? Math.round(ago / 6e4) + " min ago"
    : ago < 864e5 ? Math.round(ago / 36e5) + " hr ago"
    : when.toLocaleDateString();
  return (snap.title || "Untitled test") + " · " + answered +
    " answered · saved " + rel;
}

/* ---------- autosave wiring ---------- */

let timer = null;
let dirty = false;

/** Mark state as changed; the next tick writes it. */
export function touch() { dirty = true; }

export function startAutosave(intervalMs) {
  stopAutosave();
  timer = setInterval(() => {
    if (!dirty) return;
    dirty = false;
    save();
  }, intervalMs || 2000);
  // A closing tab does not wait for the interval.
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function flush() {
  dirty = false;
  save();
}

export function stopAutosave() {
  if (timer) { clearInterval(timer); timer = null; }
}
