/* Modal sheets, accordions, and the Help / Assistive Technology panels.

   Help, Shortcuts and Assistive Technology all use the exam app's shape: a
   titled sheet, Expand All / Collapse All, accordion rows, gold Close. */

import { esc } from "../core/dom.js";
import { typeset } from "../core/typeset.js";
import { curSec, el } from "../core/state.js";

let askResolve = null;

export function ask(title, body, yes, no) {
  el.askTitle.textContent = title;
  el.askBody.textContent = body;
  el.askYes.textContent = yes || "OK";
  el.askNo.textContent = no || "Cancel";
  el.askScrim.hidden = false;
  el.askYes.focus();
  return new Promise((r) => { askResolve = r; });
}

export function closeAsk(v) {
  el.askScrim.hidden = true;
  if (askResolve) { askResolve(v); askResolve = null; }
}

export function openSheet(scrim) { scrim.hidden = false; }
export function closeSheet(scrim) { scrim.hidden = true; }

export function accordionHTML(items, openFirst) {
  return '<div class="acc">' + items.map((it, i) => {
    const open = openFirst && i === 0;
    return '<div class="acc-item">' +
      '<button class="acc-h" type="button" aria-expanded="' + (open ? "true" : "false") + '">' +
      "<span>" + it[0] + '</span><span class="pm" aria-hidden="true"></span></button>' +
      '<div class="acc-b"' + (open ? "" : " hidden") + ">" + it[1] + "</div></div>";
  }).join("") + "</div>";
}

export function wireAccordion(root) {
  root.addEventListener("click", (e) => {
    const h = e.target.closest(".acc-h");
    if (!h || !root.contains(h)) return;
    const open = h.getAttribute("aria-expanded") === "true";
    h.setAttribute("aria-expanded", String(!open));
    h.nextElementSibling.hidden = open;
  });
}

export function setAllAccordions(root, open) {
  root.querySelectorAll(".acc-h").forEach((h) => {
    h.setAttribute("aria-expanded", String(open));
    h.nextElementSibling.hidden = !open;
  });
}

export function openBBSheet(title, items) {
  el.kbdScrim.querySelector("h2").textContent = title;
  el.kbdBody.innerHTML =
    '<div class="bb-tools"><button type="button" data-acc="open">Expand All</button>' +
    '<span class="sep">|</span><button type="button" data-acc="shut">Collapse All</button></div>' +
    accordionHTML(items, true) +
    '<div class="sheet-foot"><button class="btn gold" type="button" data-acc="close">Close</button></div>';
  typeset(el.kbdBody);
  openSheet(el.kbdScrim);
}

export function openHelp() {
  openBBSheet("Help", [
    ["Zoom and Magnification", "<p>Control with Plus or Minus resizes the question text; Control with 0 puts it back to 100%. The layout does not reflow, so nothing moves out from under you.</p>"],
    ["Highlights &amp; Notes", "<p>Select any passage or question text, then pick a color from the popup. Click a highlight again to change its color, delete it, or attach a note. Notes appear in a column beside the passage and travel with your answers.</p>"],
    ["Testing Timers", "<p>Each section runs its own clock. Hide shows a small stopwatch instead of the numbers. When a section runs out you are asked whether to keep working or stop and build results; nothing is submitted either way.</p>"],
    ["Line Reader", "<p>Dims the page except one band. Drag it anywhere, switch between full and half width, and step the height with the chevron.</p>"],
    ["Option Eliminator", "<p>The ABC button turns on cross-out. Ruling out a choice you had selected also clears the selection.</p>"],
    ["Mark for Review", "<p>Flags a question so it stands out on the review page. It does not affect scoring.</p>"],
    ["Note an issue", "<p>Records what you think is wrong with a question in your own words. Whoever grades the test re-checks those questions first.</p>"],
    ["Question Menu", "<p>The button at the bottom opens the questions in the current section, showing which are answered, unanswered, or marked.</p>"],
    ["Saved progress", "<p>Your answers, highlights, notes and remaining time are saved in this browser as you work. Closing the tab by accident does not lose them &mdash; reopen the app and choose Resume.</p>"],
  ]);
}

export function openAT() {
  openBBSheet("Assistive Technology", [
    ["Keyboard navigation", "<p>Every control is reachable with Tab, and Enter or Space activates it. Focus outlines stay visible throughout.</p>"],
    ["Screen readers", "<p>Answer choices announce their letter and selected state. Question boxes announce answered, marked, and noted state.</p>"],
    ["Math", "<p>Typeset math carries readable markup. The math answer box accepts typed LaTeX directly if you prefer not to use the palette.</p>"],
    ["Figures", "<p>Every figure carries a text description. Screen readers read it in place of the drawing.</p>"],
    ["Motion", "<p>If your system asks for reduced motion, all animation is switched off.</p>"],
    ["Zoom", "<p>Text scales without reflowing the layout, so the page keeps its shape as you magnify.</p>"],
  ]);
}

export function anchorPanel(scrim, trigger) {
  const top = el.topbar.getBoundingClientRect().bottom;
  scrim.style.setProperty("--paneltop", Math.round(top) + "px");
  const caret = scrim.querySelector(".panel-caret");
  if (caret && trigger) {
    const r = trigger.getBoundingClientRect();
    caret.style.left = Math.round(r.left + r.width / 2 - 11) + "px";
  }
}

export function wireDialogs() {
  el.askYes.addEventListener("click", () => closeAsk(true));
  el.askNo.addEventListener("click", () => closeAsk(false));

  el.dirClose.addEventListener("click", () => closeSheet(el.dirScrim));
  el.kbdClose.addEventListener("click", () => closeSheet(el.kbdScrim));
  el.hlClose.addEventListener("click", () => closeSheet(el.hlScrim));

  [el.dirScrim, el.kbdScrim, el.hlScrim, el.askScrim].forEach((s) => {
    s.addEventListener("click", (e) => {
      if (e.target !== s) return;
      if (s === el.askScrim) closeAsk(false); else closeSheet(s);
    });
  });

  el.kbdBody.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acc]");
    if (!b) return;
    const k = b.getAttribute("data-acc");
    if (k === "open") setAllAccordions(el.kbdBody, true);
    else if (k === "shut") setAllAccordions(el.kbdBody, false);
    else closeSheet(el.kbdScrim);
  });
  wireAccordion(el.kbdBody);

  el.dirBtn.addEventListener("click", () => {
    if (el.dirBtn.disabled) return;
    const sec = curSec();
    const head = sec
      ? '<p style="text-align:center;margin:0 0 18px;font-weight:600">' +
        esc(sec.name) + (sec.label ? " &mdash; " + esc(sec.label) : "") + "</p>"
      : "";
    el.dirBody.innerHTML = head +
      ((sec && sec.directions) || "<p>No directions were provided for this section.</p>");
    typeset(el.dirBody);
    anchorPanel(el.dirScrim, el.dirBtn);
    openSheet(el.dirScrim);
  });
}
