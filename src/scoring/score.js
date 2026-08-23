/* Scoring the discrete-answer questions against the hashed key.

   Only types with a fixed set of choices are scored — mcq, truefalse, multi,
   dropdown, matching. Free response never is: it goes to a human (or to Claude)
   with the results file.

   A question is counted in the denominator only when the key actually carries a
   hash for it. An author who keys 18 of 25 questions gets "x / 18", not a
   silently wrong "x / 25". */

import { Q, meta, source, state } from "../core/state.js";
import { canonical, hashAnswer, isScorable } from "./hash.js";

/** The key block from the loaded .bbtest, or null when the test carries none. */
export function keyBlock() {
  const d = source.data;
  if (!d || !d.key || typeof d.key !== "object") return null;
  const answers = d.key.answers;
  const salt = d.key.salt || "";
  if (!salt || !answers || typeof answers !== "object") return null;
  return { salt, answers, algo: d.key.algo || "sha256-v1" };
}

export function hasKey() { return !!keyBlock(); }

/** How much the app is allowed to say at submit: "none" | "total" | "detailed". */
export function revealMode() {
  const m = String(meta.scoreReveal || "none").toLowerCase();
  return ["none", "total", "detailed"].indexOf(m) >= 0 ? m : "none";
}

/**
 * Score every keyed, scorable question.
 * Returns null when the test carries no key, so callers can skip the section
 * entirely rather than printing a meaningless 0 / 0.
 */
export async function scoreTest() {
  const key = keyBlock();
  if (!key) return null;

  const perQuestion = [];
  let correct = 0;
  let scored = 0;
  let blank = 0;

  for (let n = 0; n < Q.length; n += 1) {
    const q = Q[n];
    if (!isScorable(q.type)) continue;
    const expected = key.answers[q.id];
    if (!expected) continue;                 // author did not key this one

    scored += 1;
    const canon = canonical(q.type, state.answers[q.id], q);
    if (canon == null) {
      blank += 1;
      perQuestion.push({ id: q.id, number: q.number, type: q.type, status: "blank" });
      continue;
    }
    /* eslint-disable no-await-in-loop -- a test is tens of questions, not thousands */
    const got = await hashAnswer(key.salt, q.id, canon);
    const ok = got === String(expected).toLowerCase();
    if (ok) correct += 1;
    perQuestion.push({
      id: q.id, number: q.number, type: q.type,
      status: ok ? "correct" : "incorrect",
    });
  }

  const result = {
    algo: key.algo,
    scored,
    correct,
    incorrect: scored - correct - blank,
    blank,
    percent: scored ? Math.round((correct / scored) * 1000) / 10 : 0,
    reveal: revealMode(),
    perQuestion,
  };
  state.score = result;
  return result;
}

/**
 * What the test-taker is allowed to see, shaped by meta.scoreReveal.
 * "none" hides everything; "total" gives the number but not which ones;
 * "detailed" names the missed questions too.
 */
export function visibleScore(score) {
  if (!score) return null;
  const mode = score.reveal;
  if (mode === "none") return null;
  const base = {
    correct: score.correct,
    scored: score.scored,
    percent: score.percent,
    blank: score.blank,
  };
  if (mode === "total") return base;
  return Object.assign(base, {
    missed: score.perQuestion.filter((p) => p.status === "incorrect").map((p) => p.number),
    blankNumbers: score.perQuestion.filter((p) => p.status === "blank").map((p) => p.number),
  });
}
