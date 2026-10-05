/* The screen router and the non-question screens: intro, between-sections,
   review, and finish. */

import { $, esc } from "../core/dom.js";
import { ICON } from "../core/icons.js";
import { typeset } from "../core/typeset.js";
import { Q, SECTIONS, cur, curSec, el, meta, state } from "../core/state.js";
import { answered, countAnswered } from "../core/answers.js";
import { syncClock } from "../core/clock.js";
import { ask } from "./dialogs.js";
import { buildTools, closeMore, setZoom } from "./toolbar.js";
import { accessibleSections, boxHTML, closeNav, legendHTML } from "./nav.js";
import { drawQuestion } from "./question.js";
import { hideDelete, hideHlBar, openNotes } from "./highlight.js";
import { setCalc } from "../calc/panel.js";
import { setReader } from "./reader.js";
import { hasKey, scoreTest, visibleScore } from "../scoring/score.js";
import { buildResult, downloadResult, resultFileName } from "../results/bbresult.js";
import { canonical, isScorable } from "../scoring/hash.js";
import { EMBED, isEmbedded, notifyHost, submitResult } from "../embed/embed.js";
import * as store from "../persist/store.js";

export function go(screen) {
  const before = state.screen;
  state.screen = screen;
  state.issueOpen = false;
  closeMore();
  render();
  el.paneRight.scrollTop = 0;
  // The left pane deliberately keeps its scroll position while you move
  // between questions that share a passage; only reset it on a real screen
  // change away from the question view.
  if (before !== "question" || screen !== "question") el.paneLeft.scrollTop = 0;
}

export function render() {
  el.who.textContent = meta.testerName || "";
  el.bottombar.hidden = state.screen !== "question";
  el.topbar.hidden = state.screen === "done";
  // nothing to describe until a section is actually open
  el.dirBtn.disabled = state.screen === "intro" || state.screen === "done";
  if (state.screen !== "question") el.pageTabs.hidden = true;
  if (state.screen !== "question") { el.notesPane.hidden = true; hideHlBar(); hideDelete(); }
  el.minibar.hidden = state.screen !== "done";
  if (state.screen !== "question") closeNav();
  const sec = curSec();

  el.previewBanner.hidden = !(meta.previewBanner &&
    (state.screen === "question" || state.screen === "review"));
  if (!el.previewBanner.hidden) el.previewBanner.textContent = meta.previewBanner;
  /* The banner is for tests where a calculator matters: a section that bans it
     outright, or one without it in a test where another section allows it.
     A history or English test that never mentions a calculator shows nothing. */
  const calcMatters = sec && (sec.noCalculator || SECTIONS.some((s) => s.calculator));
  const noCalc = calcMatters && !sec.calculator &&
    (state.screen === "question" || state.screen === "review");
  el.nocalcBanner.hidden = !noCalc;
  if (noCalc) {
    el.nocalcMid.textContent = meta.previewBanner || "";
    el.previewBanner.hidden = true;
  }

  buildTools();
  syncClock();
  setZoom(state.zoom);

  if (state.screen === "intro") drawIntro();
  else if (state.screen === "question") drawQuestion();
  else if (state.screen === "between") drawBetween();
  else if (state.screen === "review") drawReview();
  else drawDone();
}

export function soloMode(html) {
  el.paneLeft.hidden = true;
  el.divider.hidden = true;
  el.paneRight.innerHTML = '<div class="solo" id="solo"></div>';
  el.solo = $("solo");
  el.solo.innerHTML = html;
  return el.solo;
}

function drawIntro() {
  el.secTitle.textContent = meta.title || "Practice Test";
  const total = Q.length;
  const totalMin = SECTIONS.reduce((a, x) => a + (x.timeLimitMinutes || 0), 0);
  const mcqish = Q.filter((q) => q.type === "mcq" || q.type === "multi" ||
    q.type === "truefalse" || q.type === "dropdown").length;
  const keyed = hasKey();

  const rows = [
    [ICON.help, "Explore this test",
      (meta.course ? esc(meta.course) + ". " : "") + total + " question" + (total === 1 ? "" : "s") +
      " across " + SECTIONS.length + " section" + (SECTIONS.length === 1 ? "" : "s") +
      (mcqish ? ", " + mcqish + " of them multiple choice" : "") + "."],
    [ICON.kbd, "Take your time",
      totalMin
        ? "Each section runs its own clock, " + totalMin + " minutes in total. You can hide the clock while you work, and nothing stops you when time runs out."
        : "This test is untimed. Work at whatever pace is useful."],
    [ICON.at, "Use the tools",
      (SECTIONS.some((s) => s.calculator)
        ? "Highlights and notes, the line reader, and the calculator all work the way they do on test day."
        : "Highlights and notes and the line reader work the way they do on test day.") +
      " Open More for the full list and the keyboard shortcuts."],
    [ICON.restart, "Your work is saved",
      "Answers, highlights, notes and the clock are saved in this browser as you go. If the tab closes, reopen the app and pick Resume."],
    keyed
      ? [ICON.warn, "Multiple choice is checked here",
        "This test carries a scrambled answer key, so the app can check the multiple-choice questions when you finish. Everything written stays for a human to grade."]
      : isEmbedded()
        ? [ICON.warn, "Graded when you finish",
          "Submitting sends your answers straight to grading. Nothing to save or download."]
        : [ICON.warn, "Nothing is scored here",
          "This test carries no answer key. When you finish, the app saves a file of your responses to hand to whoever is grading it."],
  ];

  const box = soloMode("");
  box.innerHTML =
    '<div class="previewwrap"><h1>' + esc(meta.title || "Practice Test") + "</h1>" +
    '<div class="prevcard">' +
      rows.map((r) =>
        '<div class="prevrow"><span class="pic">' + r[0] + "</span>" +
        "<div><h3>" + r[1] + "</h3><p>" + r[2] + "</p></div></div>"
      ).join("") +
      (totalMin ? '<div class="optrow"><input type="checkbox" id="useTimer" checked><label for="useTimer">Run the section clocks</label></div>' : "") +
    "</div>" +
    '<div class="introfoot"><button class="btn wide" id="startBtn" type="button">Start test</button></div>' +
    "</div>";
  typeset(box);

  const cb = $("useTimer");
  if (cb) cb.addEventListener("change", () => { state.timerOn = cb.checked; });
  $("startBtn").addEventListener("click", () => {
    if (!Q.length) {
      el.alertBanner.textContent = "This test file contains no questions.";
      el.alertBanner.hidden = false;
      return;
    }
    state.started = true;
    state.startedAt = Date.now();
    state.i = 0;
    go("question");
  });
}

function drawBetween() {
  const sec = SECTIONS[curSec().index];
  el.secTitle.textContent = sec.name;
  const box = soloMode("");
  box.innerHTML =
    '<div class="finish" style="padding-top:60px">' +
      "<h1>This section is over</h1>" +
      '<p style="color:var(--ink-soft);font-size:17px">Everything you entered is kept. Next up: <strong>' +
        esc(sec.name) + (sec.label ? " — " + esc(sec.label) : "") + "</strong>, " +
        sec.count + " question" + (sec.count === 1 ? "" : "s") +
        (sec.timeLimitMinutes ? ", " + sec.timeLimitMinutes + " minutes" : "") + ".</p>" +
      '<div class="center"><button class="btn gold wide" id="goOn" type="button">Continue</button>' +
      '<button class="btn quiet" id="seeDir" type="button">Read the directions</button></div>' +
    "</div>";
  $("goOn").addEventListener("click", () => {
    el.alertBanner.hidden = true;
    go("question");
  });
  $("seeDir").addEventListener("click", () => el.dirBtn.click());
}

function drawReview() {
  el.secTitle.textContent = meta.title || "Practice Test";
  const un = Q.filter((q) => !answered(q));
  const mk = Q.filter((q) => state.marked[q.id]);
  const nt = Q.filter((q) => state.issues[q.id] && state.issues[q.id].trim());
  const nums = (a) => a.map((q) => q.number).join(", ");

  let cards = "";
  accessibleSections().forEach((sec) => {
    const list = Q.filter((q) => q.section === sec);
    if (!list.length) return;
    cards +=
      '<div class="reviewcard"><div class="rc-head">' +
        "<h2>" + esc(sec.name) + (sec.label ? " - " + esc(sec.label) : "") + " Questions</h2>" +
      '</div><div class="grid">' + list.map(boxHTML).join("") + "</div></div>";
  });

  const box = soloMode("");
  box.style.maxWidth = "860px";
  box.innerHTML =
    '<div class="reviewhead"><h1>Check Your Work</h1>' +
    "<p>Select a question to go back to it. Nothing here is scored.</p></div>" +
    '<div class="legend">' + legendHTML() + "</div>" + cards +
    '<div class="summary"><strong>' + countAnswered() + " of " + Q.length + " answered</strong><ul>" +
      "<li>Unanswered: " + (un.length ? nums(un) : "none") + "</li>" +
      "<li>Marked for Review: " + (mk.length ? nums(mk) : "none") + "</li>" +
      "<li>Notes left: " + (nt.length ? nums(nt) : "none") + "</li>" +
    "</ul></div>" +
    '<div class="center">' +
      '<button class="btn quiet" id="backQ" type="button">Back to question ' + (state.i + 1) + "</button>" +
      '<button class="btn wide" id="finishBtn" type="button">Finish and build my results</button>' +
    "</div>";

  $("backQ").addEventListener("click", () => go("question"));
  $("finishBtn").addEventListener("click", () => {
    if (!un.length) { go("done"); return; }
    ask("Finish with blanks?",
      "Question" + (un.length === 1 ? " " : "s ") + nums(un) +
        (un.length === 1 ? " is" : " are") + " still unanswered.",
      "Finish anyway", "Keep working").then((ok) => { if (ok) go("done"); });
  });
}

const CONFETTI = ["#f5c518", "#2f5fd0", "#e0567c", "#43b3a0", "#f08a3c", "#8a6fd6"];

function confettiHTML() {
  let h = '<div class="confetti" aria-hidden="true">';
  for (let i = 0; i < 60; i += 1) {
    const c = CONFETTI[i % CONFETTI.length];
    const dur = (2.6 + Math.random() * 2.4).toFixed(2);
    const delay = (Math.random() * 2.2).toFixed(2);
    const w = 6 + Math.floor(Math.random() * 6);
    h += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;top:" + (Math.random() * 18).toFixed(1) +
      "%;width:" + w + "px;height:" + (w + 4) + "px;background:" + c +
      ";animation-duration:" + dur + "s;animation-delay:" + delay +
      's;animation-iteration-count:infinite"></i>';
  }
  return h + "</div>";
}

const FINISH_ART =
  '<svg class="art" viewBox="0 0 230 160" aria-hidden="true">' +
    '<ellipse cx="115" cy="72" rx="62" ry="62" fill="#eef1fb"/>' +
    '<rect x="52" y="30" width="126" height="82" rx="7" fill="#fff" stroke="#5b6478" stroke-width="3"/>' +
    '<rect x="63" y="41" width="104" height="60" rx="3" fill="#fff" stroke="#5b6478" stroke-width="2.4"/>' +
    '<circle cx="115" cy="71" r="21" fill="#cfe8f7" stroke="#5b6478" stroke-width="2.4"/>' +
    '<path d="M106 66c1.6-2.4 4.4-2.4 6 0M118 66c1.6-2.4 4.4-2.4 6 0" stroke="#22303f" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
    '<path d="M105 76a10.5 10.5 0 0020 0z" fill="#22303f"/>' +
    '<rect x="38" y="112" width="154" height="12" rx="5" fill="#dfe3ec" stroke="#5b6478" stroke-width="2.6"/>' +
  "</svg>";

function scorePanelHTML(vis) {
  if (!vis) return "";
  let h = '<div class="scorecard"><h2>Multiple choice</h2>' +
    '<p class="scorebig"><strong>' + vis.correct + "</strong> / " + vis.scored +
    ' <span class="scorepct">(' + vis.percent + "%)</span></p>";
  if (vis.blank) h += "<p class=\"scorenote\">" + vis.blank + " left blank.</p>";
  if (vis.missed) {
    h += '<p class="scorenote">Missed: ' + (vis.missed.length ? vis.missed.join(", ") : "none") + "</p>";
    if (vis.blankNumbers && vis.blankNumbers.length) {
      h += '<p class="scorenote">Blank: ' + vis.blankNumbers.join(", ") + "</p>";
    }
  }
  h += '<p class="scorenote">Written responses are not scored here.</p></div>';
  return h;
}

/* Embedded, finishing IS submitting: the result goes straight to the host,
   which scores it against a key the browser never sees. The tester can still
   keep a copy of the file. */
function drawDoneEmbedded() {
  setCalc(false);
  setReader(false);
  el.secTitle.textContent = "";

  const box = soloMode("");
  box.innerHTML =
    '<div class="finish embed-finish">' +
      "<h1>Test finished</h1>" +
      '<div class="donecard">' +
        '<p class="submit-line" id="submitLine" role="status">Submitting your answers…</p>' +
        '<div id="scoreSlot"></div>' +
        '<div class="submit-actions" id="submitActions" hidden></div>' +

      "</div>" +
    "</div>";


  const answers = {};
  Q.forEach((q) => {
    if (!isScorable(q.type)) return;
    const c = canonical(q.type, state.answers[q.id], q);
    if (c != null) answers[q.id] = c;
  });
  const payload = { attempt: EMBED.attempt, result: buildResult(), answers };

  const send = () => {
    $("submitLine").textContent = "Submitting your answers…";
    $("submitLine").classList.remove("failed");
    $("submitActions").hidden = true;
    submitResult(payload).then((reply) => {
      store.stopAutosave();
      store.clear();
      const line = $("submitLine");
      if (!line) return;
      line.textContent = reply && reply.resultsHref ? "Submitted. Taking you to grading…" : "Submitted.";
      if (reply && reply.visibleScore) {
        $("scoreSlot").innerHTML = scorePanelHTML(reply.visibleScore);
      }
      const actions = $("submitActions");
      if (reply && reply.resultsHref) {
        actions.innerHTML = '<a class="btn gold" id="toResults" target="_top" href="' +
          esc(reply.resultsHref) + '">See results</a>';
        actions.hidden = false;
      }
      notifyHost({ type: "bb:submitted", attempt: EMBED.attempt, reply });
    }).catch((err) => {
      const line = $("submitLine");
      if (!line) return;
      line.textContent = err.message;
      line.classList.add("failed");
      const actions = $("submitActions");
      actions.innerHTML = '<button class="btn gold" id="retrySubmit" type="button">Try again</button>';
      actions.hidden = false;
      $("retrySubmit").addEventListener("click", send);
    });
  };
  send();
}

function drawDone() {
  if (isEmbedded()) { drawDoneEmbedded(); return; }
  setCalc(false);
  setReader(false);
  el.secTitle.textContent = "";

  const keyed = hasKey();
  const box = soloMode("");
  box.innerHTML =
    '<div class="finish">' + confettiHTML() +
      "<h1>You&rsquo;re All Finished!</h1>" +
      '<div class="donecard">' + FINISH_ART +
        '<div id="scoreSlot"></div>' +
        "<p>Your responses are ready. Save the file below and attach it to your chat to be graded.</p>" +
        (keyed
          ? "<p>The multiple-choice questions were checked against this test&rsquo;s key. Everything written still needs a human.</p>"
          : "<p>Nothing was scored here &mdash; this test carried no answer key.</p>") +
        '<button class="btn gold wide" id="saveBtn" type="button">Save my results file</button>' +
        '<div style="margin-top:10px"><span class="ok" id="okMsg" hidden></span></div>' +
        '<p class="filehint" id="fileHint"></p>' +
      "</div>" +
      '<div class="outrow"><button class="btn quiet" id="backRev" type="button">Back to review</button></div>' +
    "</div>";

  $("fileHint").textContent = "Saves as " + resultFileName();
  $("backRev").addEventListener("click", () => go("review"));
  $("saveBtn").addEventListener("click", () => {
    const name = downloadResult();
    const o = $("okMsg");
    o.textContent = "Saved " + name;
    o.hidden = false;
  });

  /* Scoring is async (SubtleCrypto), so the screen paints first and the panel
     drops in when the hashes come back. A test with no key resolves to null
     and nothing is shown. */
  if (keyed) {
    scoreTest().then((score) => {
      const slot = $("scoreSlot");
      if (!slot) return;                     // navigated away before it resolved
      slot.innerHTML = scorePanelHTML(visibleScore(score));
    }).catch(() => { /* results file still saves without a score */ });
  }
}
