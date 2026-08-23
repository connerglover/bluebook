/* The results file.

   Replaces the copy-paste "PRACTICE TEST RESULTS" block the single-file shell
   printed. A downloaded .bbresult.json survives long tests that a paste would
   truncate, and attaches to a chat in one step.

   The `.json` suffix is deliberate: chat upload filters routinely reject
   extensions they do not recognise, and a bare .bbresult gets bounced. */

import { Q, SECTIONS, meta, source, state } from "../core/state.js";
import { answered, countAnswered } from "../core/answers.js";
import { fmtClock } from "../core/clock.js";
import { describeQuestion } from "./describe.js";

export const RESULT_FORMAT = 1;

export function buildResult() {
  const now = new Date();

  const sections = SECTIONS.map((sec) => ({
    name: sec.name,
    label: sec.label || "",
    calculator: !!sec.calculator,
    timeLimitMinutes: sec.timeLimitMinutes || 0,
    timeUsedSeconds: Math.round(sec.used || 0),
    questions: Q.filter((q) => q.section === sec).map((q) => ({
      number: q.number,
      id: q.id,
      type: q.type,
      answer: describeQuestion(q),
      answered: answered(q),
      markedForReview: !!state.marked[q.id],
      issue: (state.issues[q.id] || "").trim() || null,
    })),
  }));

  const marginNotes = Object.keys(state.hlNotes)
    .map((k) => state.hlNotes[k])
    .filter((n) => n && n.text && n.text.trim())
    .map((n) => ({ question: n.qn, quote: n.quote, note: n.text.trim() }));

  const unanswered = Q.filter((q) => !answered(q)).map((q) => q.number);
  const marked = Q.filter((q) => state.marked[q.id]).map((q) => q.number);
  const disputed = Q.filter((q) => (state.issues[q.id] || "").trim())
    .map((q) => ({ number: q.number, id: q.id, note: state.issues[q.id].trim() }));

  return {
    format: RESULT_FORMAT,
    kind: "bbresult",
    generatedAt: now.toISOString(),
    generatedAtLocal: now.toLocaleString(),
    test: {
      title: meta.title || "Untitled",
      course: meta.course || "",
      id: source.testId,
      file: source.fileName || "",
      gradingNote: (meta.gradingNote || "").trim() || null,
    },
    tester: meta.testerName || "",
    timing: {
      totalSecondsUsed: Math.round(state.spent),
      totalDisplay: fmtClock(state.spent),
      startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      timersEnabled: !!state.timerOn,
    },
    progress: {
      answered: countAnswered(),
      total: Q.length,
      unanswered,
      markedForReview: marked,
    },
    /* Present only when the test carried an answer key. Free response is never
       scored here — that is what the grader is for. */
    autoScore: state.score
      ? {
          scored: state.score.scored,
          correct: state.score.correct,
          incorrect: state.score.incorrect,
          blank: state.score.blank,
          percent: state.score.percent,
          perQuestion: state.score.perQuestion,
        }
      : null,
    sections,
    disputed,
    marginNotes,
  };
}

export function resultFileName() {
  const slug = (s) => String(s || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "test";
  const d = new Date();
  const stamp = d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
  return slug(meta.title) + "-" + slug(meta.testerName) + "-" + stamp + ".bbresult.json";
}

export function downloadResult() {
  const text = JSON.stringify(buildResult(), null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = resultFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoking immediately can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return a.download;
}
