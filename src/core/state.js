/* The data model and the mutable app state.

   The single-file shell built this at script-evaluation time from a `TEST_DATA`
   constant spliced into the file. The hosted app receives the test at runtime,
   so the containers are exported empty and `buildModel()` fills them IN PLACE.
   That matters: every other module holds a live binding to these objects, and
   reassigning them (`Q = [...]`) would leave every importer pointing at the old
   array. Mutate, never reassign. */

import { $ } from "./dom.js";

export const meta = {};
export const SECTIONS = [];
export const Q = [];

/** The raw parsed .bbtest, kept for the results file and for re-hydration. */
export const source = { data: null, fileName: "", testId: "" };

export const state = {
  screen: "intro", i: 0, started: false,
  answers: {}, marked: {}, issues: {}, struck: {},
  hl: {}, hlNotes: {},
  elim: false, issueOpen: false,
  zoom: 1, timerOn: true, clockVisible: true,
  secLeft: 0, secTicker: null, startedAt: null, spent: 0,
  reader: { on: false, y: 260, h: 74 },
  layout: "paged", page: "stim",
  breakLeft: 0, breakTicker: null,
  splitRatio: 0.5,
  /* Filled by the scorer at submit time; never populated before then. */
  score: null,
};

export const el = {};

const EL_IDS = [
  "alertBanner", "topbar", "secTitle", "dirBtn", "clockWrap", "clock", "clockToggle", "tools",
  "previewBanner", "nocalcBanner", "nocalcMid", "main", "split", "paneLeft", "divider", "paneRight", "solo",
  "bottombar", "who", "navToggle", "navLabel", "backBtn", "nextBtn", "backdrop", "navpop", "navpopTitle",
  "navLegend", "navGrid", "toReview", "askScrim", "askTitle", "askBody", "askYes", "askNo", "dirScrim",
  "dirClose", "dirBody", "dirTitle", "refClose", "refBody", "kbdScrim", "kbdClose", "kbdBody",
  "hlScrim", "hlClose", "hlBody", "notesPane", "notesList", "delPop", "delNo", "delYes", "reader",
  "shTop", "shBot", "shLeft", "shRight", "readerWidth", "readerStep", "readerFoot",
  "refPanel", "refWide", "refExpand", "refCollapse", "timeScrim", "timeStay", "timeFinish", "slit",
  "readerBar", "readerGrip", "readerOff", "hlToolbar",
  "calc", "calcGrip", "calcBody", "calcClose", "tiShell", "tiGrip", "tiBody", "tiClose", "tiPopup",
  "minibar", "navClose", "pageTabs", "notesClose", "breakScreen", "breakClock", "breakResume",
  "app", "signin",
];

export function cacheElements() {
  EL_IDS.forEach((k) => { el[k] = $(k); });
  return el;
}

const META_DEFAULTS = {
  course: "", title: "Practice Test", testerName: "Tester",
  previewBanner: "", gradingNote: "", reference: "",
  /* "none" | "total" | "detailed" — the author decides how much the app says
     about the score at submit. Defaults to silence, matching the old runtime. */
  scoreReveal: "none",
};

/** A stable per-test identifier, used to key saved progress. */
function testIdFor(data) {
  const m = (data && data.meta) || {};
  if (m.id) return String(m.id);
  const basis = (m.course || "") + "|" + (m.title || "") + "|" +
    ((data.sections || []).reduce((n, s) => n + ((s.questions || []).length), 0));
  let h = 5381;
  for (let i = 0; i < basis.length; i += 1) h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  return "t" + h.toString(36);
}

/**
 * Populate meta / SECTIONS / Q from a parsed .bbtest object.
 * Assumes the data already passed validation in loader/validate.js.
 */
export function buildModel(data, fileName) {
  source.data = data;
  source.fileName = fileName || "";
  source.testId = testIdFor(data);

  Object.keys(meta).forEach((k) => { delete meta[k]; });
  Object.assign(meta, META_DEFAULTS, (data && data.meta) || {});

  SECTIONS.length = 0;
  Q.length = 0;

  (data.sections || []).forEach((s, si) => {
    const sec = {
      index: si,
      name: s.name || ("Section " + (si + 1)),
      label: s.label || "",
      calculator: !!s.calculator,
      timeLimitMinutes: s.timeLimitMinutes || 0,
      directions: s.directions || "",
      questions: s.questions || [],
      /* Passage groups: one long source text shared by a run of questions.
         Each entry is { id, title, html|text, questions:[ids] }. */
      passages: (s.passages || []).map((p, pi) => ({
        id: p.id || ("p" + (si + 1) + "-" + (pi + 1)),
        title: p.title || "",
        text: p.text || "",
        html: p.html || "",
        figure: p.figure || null,
        caption: p.caption || "",
        questions: p.questions || [],
      })),
    };
    SECTIONS.push(sec);
  });

  SECTIONS.forEach((sec) => {
    sec.first = Q.length;
    (sec.questions || []).forEach((q) => {
      const item = Object.assign({}, q);
      item.section = sec;
      item.type = item.type || "mcq";
      if (item.type === "truefalse") item.choices = ["True", "False"];
      item.number = Q.length + 1;
      item.id = item.id || ("q" + item.number);
      Q.push(item);
    });
    sec.last = Q.length - 1;
    sec.count = (sec.questions || []).length;
  });

  /* Bind questions to their passage. A question may name one explicitly with
     `passage: "p1"`; otherwise a passage that lists the question id claims it.
     Questions keep their own `stimulus` as before — the two coexist. */
  SECTIONS.forEach((sec) => {
    const byId = {};
    sec.passages.forEach((p) => { byId[p.id] = p; });
    Q.filter((q) => q.section === sec).forEach((q) => {
      if (q.passage && byId[q.passage]) { q.passageRef = byId[q.passage]; return; }
      const owner = sec.passages.find((p) => (p.questions || []).indexOf(q.id) >= 0);
      if (owner) q.passageRef = owner;
    });
  });

  return { meta, SECTIONS, Q };
}

/** Wipe every answer and marker, keeping the loaded test. */
export function resetProgress() {
  state.screen = "intro";
  state.i = 0;
  state.started = false;
  state.answers = {}; state.marked = {}; state.issues = {}; state.struck = {};
  state.hl = {}; state.hlNotes = {};
  state.elim = false; state.issueOpen = false;
  state.startedAt = null; state.spent = 0;
  state.score = null;
  SECTIONS.forEach((sec) => {
    sec.budget = (sec.timeLimitMinutes || 0) * 60;
    sec.left = sec.budget;
    sec.used = 0;
  });
}

export const cur = () => Q[state.i];
export const curSec = () => (cur() ? cur().section : SECTIONS[0]);

/* One breakpoint drives every narrow-window decision, in CSS and here.
   Guarded: an environment without matchMedia would otherwise throw at boot and
   take the whole app down before the first question renders. */
export const NARROW = (typeof window !== "undefined" && window.matchMedia &&
  window.matchMedia("(max-width: 860px)")) || null;

export function isNarrow() {
  if (NARROW) return NARROW.matches;
  return (window.innerWidth || 1200) <= 860;
}

export function applyNarrowClass() {
  document.body.classList.toggle("narrow", isNarrow());
}
