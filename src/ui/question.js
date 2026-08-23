/* The question screen: left pane (passage or stimulus), right pane (stem,
   inputs, issue box), and the narrow-window page tabs. */

import { $, esc, richHTML } from "../core/dom.js";
import { ICON } from "../core/icons.js";
import { typeset } from "../core/typeset.js";
import { Q, cur, el, isNarrow, state } from "../core/state.js";
import { renderFields, renderSlot } from "../render/index.js";
import { renderFigure } from "../render/figure.js";
import { paintNav } from "./nav.js";
import { applySplit } from "./split.js";
import { paintNotes } from "./highlight.js";
import { applyCalcShift } from "../calc/panel.js";
import { go } from "./screens.js";

const ICON_STACK = '<svg viewBox="0 0 20 20"><rect x="2.5" y="3" width="15" height="6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="2.5" y="11" width="15" height="6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';

/* Which passage (or stimulus) the left pane currently holds. A passage shared
   by a run of questions must NOT be re-rendered when you move between them:
   re-rendering would reset the scroll position and wipe the live highlight
   marks out of the DOM. Comparing this key is what keeps the pane still. */
let leftKey = null;

/** The id under which the left pane's highlights are stored. */
export function leftSlotOwner(q) {
  return q.passageRef ? "passage:" + q.passageRef.id : q.id;
}

function hasLeft(q) {
  return !!(q.passageRef || q.stimulus);
}

function stimulusHTML(st) {
  let h = "";
  if (st.text) h += richHTML(st.text);
  if (st.table) {
    h += '<table class="datatable"><tbody>';
    if (st.table.head) {
      h += "<tr>" + st.table.head.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr>";
    }
    (st.table.rows || []).forEach((r) => {
      h += "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>";
    });
    h += "</tbody></table>";
  }
  if (st.caption) h += '<p class="figcap">' + esc(st.caption) + "</p>";
  return h;
}

function drawLeftPane(q) {
  if (!hasLeft(q)) {
    el.paneLeft.hidden = true;
    el.divider.hidden = true;
    leftKey = null;
    return;
  }

  el.paneLeft.hidden = false;
  el.divider.hidden = false;

  const key = leftSlotOwner(q);
  const owner = key;
  if (leftKey === key) {
    // Same passage as the previous question — leave the DOM exactly as it is.
    applySplit();
    return;
  }

  const host = document.createElement("div");
  host.className = "stimulus hlable";
  host.setAttribute("data-hlslot", "stim");

  const p = q.passageRef;
  if (p) {
    if (p.title) {
      const t = document.createElement("h2");
      t.className = "passage-title";
      t.textContent = p.title;
      host.appendChild(t);
    }
    const body = document.createElement("div");
    body.className = "passage-body";
    body.innerHTML = p.html ? String(p.html) : richHTML(p.text);
    host.appendChild(body);
    if (p.figure) {
      const fig = renderFigure(p.figure);
      if (fig) host.appendChild(fig);
    }
    if (p.caption) {
      const cap = document.createElement("p");
      cap.className = "figcap";
      cap.textContent = p.caption;
      host.appendChild(cap);
    }
  }

  const st = q.stimulus;
  if (st) {
    const block = document.createElement("div");
    block.innerHTML = stimulusHTML(st);
    // st.image predates the figure field; route it through the same checks.
    if (st.image) {
      const fig = renderFigure({ src: st.image, alt: st.alt || "Figure" });
      if (fig) block.insertBefore(fig, block.firstChild);
    }
    if (st.figure) {
      const fig = renderFigure(st.figure);
      if (fig) block.appendChild(fig);
    }
    host.appendChild(block);
  }

  el.paneLeft.innerHTML = "";
  el.paneLeft.appendChild(host);

  const saved = (state.hl[owner] || {}).stim;
  if (saved) host.innerHTML = saved;

  typeset(el.paneLeft);
  applySplit();
  el.paneLeft.scrollTop = 0;
  leftKey = key;
}

/** Force the next draw to rebuild the left pane (used after a restart). */
export function invalidateLeftPane() { leftKey = null; }

/* A passage and its question do not fit side by side on a narrow screen, so
   they become two pages. Anyone who would rather scroll can stack them. */
export function paintPageTabs(q) {
  const paged = isNarrow() && hasLeft(q);
  el.pageTabs.hidden = !paged;
  el.split.classList.toggle("paged", paged && state.layout === "paged");
  el.split.classList.toggle("stacked", paged && state.layout === "stacked");
  if (!paged) { el.split.removeAttribute("data-page"); return; }
  el.split.setAttribute("data-page", state.page);
  const label = q.passageRef ? "Passage" : "Passage";
  el.pageTabs.innerHTML =
    '<div class="seg">' +
      '<button type="button" data-page="stim" aria-pressed="' + (state.layout === "paged" && state.page === "stim") + '">' + label + "</button>" +
      '<button type="button" data-page="q" aria-pressed="' + (state.layout === "paged" && state.page === "q") + '">Question</button>' +
    "</div>" +
    '<button type="button" class="aio" id="aioToggle" aria-pressed="' + (state.layout === "stacked") + '" ' +
    'title="Show both at once" aria-label="Show passage and question together">' + ICON_STACK + "</button>";
}

export function drawQuestion() {
  const q = cur();
  if (!q) return;
  const sec = q.section;
  const total = Q.length;

  el.secTitle.textContent = sec.name + (sec.label ? " - " + sec.label : "");
  el.navLabel.textContent = "Question " + q.number + " of " + total;
  el.backBtn.disabled = state.i === 0;
  el.nextBtn.textContent = state.i === total - 1 ? "Review" : "Next";

  drawLeftPane(q);
  paintPageTabs(q);

  // ---- right pane ----
  el.paneRight.innerHTML = '<div class="solo" id="solo"></div>';
  el.solo = $("solo");
  const marked = !!state.marked[q.id];
  const noted = !!(state.issues[q.id] && state.issues[q.id].trim());

  const head = document.createElement("div");
  head.className = "qhead";
  head.innerHTML =
    '<span class="qnum">' + q.number + "</span>" +
    '<button type="button" class="qmark" id="markBtn" aria-pressed="' + marked + '">' +
      (marked ? ICON.bmkF : ICON.bmkO) + "<span>" + (marked ? "Marked for Review" : "Mark for Review") + "</span></button>" +
    '<button type="button" class="qmark" id="issueBtn" aria-pressed="' + noted + '" style="color:' + (noted ? "var(--note)" : "inherit") + '">' +
      (noted ? ICON.flagF : ICON.flagO) + "<span>" + (noted ? "Note left" : "Note an issue") + "</span></button>" +
    '<span class="grow"></span>' +
    (q.type === "mcq" || q.type === "multi" || q.type === "truefalse"
      ? '<button type="button" class="abc" id="elimBtn" aria-pressed="' + state.elim + '" title="Cross out answer choices">ABC</button>' : "");
  el.solo.appendChild(head);

  if (q.prompt && q.type !== "fill") {
    const stem = document.createElement("div");
    stem.className = "stem hlable";
    stem.setAttribute("data-hlslot", "stem");
    stem.innerHTML = richHTML(q.prompt);
    el.solo.appendChild(stem);
    const savedStem = (state.hl[q.id] || {}).stem;
    if (savedStem) stem.innerHTML = savedStem;
  }

  // A figure attached to the question itself sits between stem and inputs.
  if (q.figure) {
    const fig = renderFigure(q.figure);
    if (fig) el.solo.appendChild(fig);
  }

  if (q.type === "parts") {
    const wrap = document.createElement("div");
    wrap.className = "parts";
    (q.parts || []).forEach((p, i) => {
      const blk = document.createElement("div");
      const lab = document.createElement("p");
      lab.className = "partlabel";
      lab.textContent = p.label || ("Part " + String.fromCharCode(65 + i));
      blk.appendChild(lab);
      if (p.prompt) {
        const pp = document.createElement("div");
        pp.className = "partprompt";
        pp.innerHTML = richHTML(p.prompt);
        blk.appendChild(pp);
      }
      if (p.figure) {
        const fig = renderFigure(p.figure);
        if (fig) blk.appendChild(fig);
      }
      const pt = p.type || "short";
      blk.appendChild(pt === "fields" ? renderFields(p, q.id + "::" + i)
                                      : renderSlot(p, q.id + "::" + i, pt));
      wrap.appendChild(blk);
    });
    el.solo.appendChild(wrap);
  } else if (q.type === "fields") {
    el.solo.appendChild(renderFields(q, q.id));
  } else {
    el.solo.appendChild(renderSlot(q, q.id, q.type));
  }

  // ---- issue box ----
  const issue = document.createElement("div");
  issue.className = "issue";
  issue.hidden = !state.issueOpen;
  issue.innerHTML =
    "<h3>Note an issue with this question</h3>" +
    "<p>Describe the problem in your own words — no correct choice, two that work, unclear wording, a typo. This travels with your answers and is not scored.</p>" +
    '<textarea id="issueField" maxlength="500" placeholder="What seems wrong with this question?"></textarea>' +
    '<div class="issue-actions"><span class="count" id="issueCount"></span>' +
    '<button type="button" class="linkbtn" id="issueClear">Clear note</button></div>';
  el.solo.appendChild(issue);

  typeset(el.solo);
  wireQuestion(q, issue);
  paintNav();
  applyCalcShift();
  paintNotes();
}

function wireQuestion(q, issue) {
  $("markBtn").addEventListener("click", () => {
    if (state.marked[q.id]) delete state.marked[q.id]; else state.marked[q.id] = true;
    drawQuestion();
  });
  const eb = $("elimBtn");
  if (eb) eb.addEventListener("click", () => { state.elim = !state.elim; drawQuestion(); });

  const field = $("issueField");
  const count = $("issueCount");
  field.value = state.issues[q.id] || "";
  const upd = () => { count.textContent = field.value.length + " / 500"; };
  upd();
  $("issueBtn").addEventListener("click", () => {
    state.issueOpen = issue.hidden;
    issue.hidden = !state.issueOpen;
    if (state.issueOpen) field.focus();
  });
  field.addEventListener("input", () => {
    if (field.value.trim()) state.issues[q.id] = field.value; else delete state.issues[q.id];
    upd();
    paintNav();
  });
  $("issueClear").addEventListener("click", () => {
    field.value = "";
    delete state.issues[q.id];
    upd();
    field.focus();
    paintNav();
  });
}

export function goNext() {
  if (state.i >= Q.length - 1) { go("review"); return; }
  const secNow = cur().section;
  state.i += 1;
  if (cur().section !== secNow) go("between"); else go("question");
}

export function goPrev() {
  if (state.i > 0) { state.i -= 1; go("question"); }
}

export function wireQuestionScreen() {
  el.backBtn.addEventListener("click", goPrev);
  el.nextBtn.addEventListener("click", goNext);
  el.pageTabs.addEventListener("click", (e) => {
    const t = e.target.closest("[data-page]");
    if (t) {
      state.layout = "paged";
      state.page = t.getAttribute("data-page");
      if (state.screen === "question") drawQuestion();
      return;
    }
    if (e.target.closest("#aioToggle")) {
      state.layout = state.layout === "stacked" ? "paged" : "stacked";
      if (state.screen === "question") drawQuestion();
    }
  });
}
