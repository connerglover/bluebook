/* The question navigator popover and the shared question-box markup that the
   review page reuses. */

import { esc } from "../core/dom.js";
import { ICON } from "../core/icons.js";
import { Q, SECTIONS, cur, curSec, el, isNarrow, meta, state } from "../core/state.js";
import { answered } from "../core/answers.js";
import { ask } from "./dialogs.js";
import { go } from "./screens.js";

export function legendHTML() {
  return '<span><i class="sw-un"></i> Unanswered</span>' +
         '<span><i class="sw-an"></i> Answered</span>' +
         '<span><i class="sw-mk">' + ICON.bmkF + "</i> Marked for Review</span>" +
         '<span><i class="sw-nt">' + ICON.flagF + "</i> Note left</span>";
}

export function boxHTML(q) {
  const i = q.number - 1;
  const here = state.screen === "question" && i === state.i;
  const cls = ["qbox"];
  if (answered(q)) cls.push("done");
  if (here) cls.push("here");
  return '<div class="qwrap">' + (here ? '<span class="pin">' + ICON.pin + "</span>" : "") +
    '<button type="button" class="' + cls.join(" ") + '" data-goto="' + i + '" aria-label="Question ' + q.number +
    (answered(q) ? ", answered" : ", unanswered") + (state.marked[q.id] ? ", marked for review" : "") +
    (state.issues[q.id] ? ", note left" : "") + '">' + q.number + "</button>" +
    (state.marked[q.id] ? '<span class="bmk">' + ICON.bmkF + "</span>" : "") +
    (state.issues[q.id] ? '<span class="bnt">' + ICON.flagF + "</span>" : "") + "</div>";
}

/* With meta.lockSections set, a section you have left is closed behind you, so
   the navigator and review page must not offer a way back into it. */
export function accessibleSections() {
  if (!meta.lockSections) return SECTIONS;
  const here = curSec();
  return here ? [here] : SECTIONS;
}

export function navGroups() {
  return accessibleSections()
    .map((sec) => ({ sec, list: Q.filter((q) => q.section === sec) }))
    .filter((g) => g.list.length);
}

export function navHTML() {
  const groups = navGroups();
  if (groups.length === 1) return '<div class="grid">' + groups[0].list.map(boxHTML).join("") + "</div>";
  return '<div class="navscroll">' + groups.map((g) =>
    '<div class="navgroup"><h3>' + esc(g.sec.name) + (g.sec.label ? " - " + esc(g.sec.label) : "") +
    '</h3><div class="grid">' + g.list.map(boxHTML).join("") + "</div></div>"
  ).join("") + "</div>";
}

export function paintNav() {
  if (!el.navpop.hidden) el.navGrid.innerHTML = navHTML();
}

export function openNav() {
  const groups = navGroups();
  const sec = curSec();
  el.navpopTitle.textContent = groups.length === 1 && sec
    ? sec.name + (sec.label ? " - " + sec.label : "") + " Questions"
    : "Questions";
  el.navLegend.innerHTML =
    '<span><i class="sw-cur">' + ICON.pin + "</i> Current</span>" +
    '<span><i class="sw-un"></i> Unanswered</span>' +
    '<span><i class="sw-mk">' + ICON.bmkF + "</i> For Review</span>";
  el.navGrid.innerHTML = navHTML();
  el.navpop.hidden = false;
  el.backdrop.hidden = false;
  el.navToggle.setAttribute("aria-expanded", "true");

  // hang it off the button rather than the middle of the viewport
  const r = el.navToggle.getBoundingClientRect();
  if (isNarrow()) {                       // full-width popover, no chasing
    el.navpop.style.removeProperty("--navx");
    el.navpop.style.setProperty("--navy", Math.round(window.innerHeight - r.top + 10) + "px");
    el.navpop.style.setProperty("--navcaret", "50%");
    return;
  }
  const cx = r.left + r.width / 2;
  const w = el.navpop.offsetWidth || 560;
  const left = Math.min(window.innerWidth - w / 2 - 12, Math.max(w / 2 + 12, cx));
  el.navpop.style.setProperty("--navx", Math.round(left) + "px");
  el.navpop.style.setProperty("--navy", Math.round(window.innerHeight - r.top + 12) + "px");
  el.navpop.style.setProperty("--navcaret", Math.round(w / 2 + (cx - left)) + "px");
}

export function closeNav() {
  el.navpop.hidden = true;
  el.backdrop.hidden = true;
  el.navToggle.setAttribute("aria-expanded", "false");
}

export function wireNav() {
  el.navToggle.addEventListener("click", () => {
    if (el.navpop.hidden) openNav(); else closeNav();
  });
  el.navClose.addEventListener("click", closeNav);
  el.backdrop.addEventListener("click", closeNav);
  el.toReview.addEventListener("click", () => { closeNav(); go("review"); });

  const home = document.getElementById("homeBtn");
  home.innerHTML = "Return to the start " + ICON.home;
  home.addEventListener("click", () => {
    ask("Start over?",
      "Your answers stay in this session, but you will land back on the opening screen.",
      "Go to the start", "Stay here").then((yes) => { if (yes) go("intro"); });
  });

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-goto]");
    if (!b) return;
    closeNav();
    state.i = parseInt(b.getAttribute("data-goto"), 10);
    go("question");
  });
}
