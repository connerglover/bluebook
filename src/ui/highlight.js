/* Highlights and the notes column.

   Two traps are baked into the shape of this file.

   The toolbar never used to survive: mouseup showed it, then the browser fired
   the click that always follows mouseup, and the outside-click handler hid it
   again in the same gesture. It flashed and vanished. `swallowClick` eats
   exactly that one click, and `selectionchange` — not mouseup — is what decides
   the popup should go away.

   Notes belong in a sidebar, not a floating card. Each highlight gets a card in
   a column beside the passage, with the quoted text in its header and a
   textarea underneath. */

import { $, esc, uid } from "../core/dom.js";
import { cur, el, state } from "../core/state.js";
import { leftSlotOwner } from "./question.js";

let hlAnchor = null;         // the mark the toolbar is acting on
let swallowClick = false;    // the click that trails a selection mouseup
let activeCard = null;
let pendingDelete = null;

const DEL_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.6 5.6h12.8M7.9 5.6V4.2a1.1 1.1 0 011.1-1.1h2a1.1 1.1 0 011.1 1.1v1.4M5.6 5.6l.75 9.9a1.6 1.6 0 001.6 1.5h4.1a1.6 1.6 0 001.6-1.5l.75-9.9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* The passage pane's marks are stored against the passage, not the question,
   so a passage shared by ten questions keeps one set of highlights rather than
   ten copies that overwrite each other. */
function slotOwner(q, slot) {
  return slot === "stim" ? leftSlotOwner(q) : q.id;
}

export function saveHl() {
  const q = cur();
  if (!q) return;
  document.querySelectorAll(".hlable").forEach((n) => {
    const slot = n.getAttribute("data-hlslot");
    const owner = slotOwner(q, slot);
    if (!state.hl[owner]) state.hl[owner] = {};
    state.hl[owner][slot] = n.innerHTML;
  });
}

export function hideHlBar() { el.hlToolbar.hidden = true; hlAnchor = null; }
export function hideDelete() { el.delPop.hidden = true; pendingDelete = null; }

function placeFixed(node, rect, above) {
  node.hidden = false;
  const w = node.offsetWidth || 210;
  const h = node.offsetHeight || 40;
  const left = Math.min(window.innerWidth - w - 10, Math.max(10, rect.left + rect.width / 2 - w / 2));
  let top = above ? rect.top - h - 10 : rect.bottom + 10;
  if (top < 8) top = rect.bottom + 10;
  if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - 10);
  node.style.left = left + "px";
  node.style.top = top + "px";
}

function selectionInHlable() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  let n = r.commonAncestorContainer;
  if (n.nodeType !== 1) n = n.parentNode;
  if (!n || !n.closest || !n.closest(".hlable")) return null;
  return r;
}

function showToolbarFor(rect, mark) {
  hlAnchor = mark || null;
  placeFixed(el.hlToolbar, rect, true);
  el.hlToolbar.querySelectorAll("[data-hl]").forEach((b) => {
    const k = b.getAttribute("data-hl");
    const on = !!(mark && mark.classList.contains("hl-" + k));
    b.setAttribute("aria-pressed", String(on));
  });
}

function wrapSelection(cls) {
  const r = selectionInHlable();
  if (!r) return null;
  const m = document.createElement("mark");
  m.className = "hl hl-" + cls;
  m.dataset.hid = uid();
  try { m.appendChild(r.extractContents()); r.insertNode(m); }
  catch (err) { return null; }
  // an inline box is sized by the font; typeset math is taller than that
  if (m.querySelector(".katex")) m.classList.add("hl-math");
  const sel = window.getSelection();
  if (sel) sel.removeAllRanges();
  return m;
}

function unwrap(m) {
  if (!m) return;
  if (m.dataset.hid) delete state.hlNotes[m.dataset.hid];
  const parent = m.parentNode;
  while (m.firstChild) parent.insertBefore(m.firstChild, m);
  m.remove();
  parent.normalize();
}

function marksOnScreen() {
  return Array.prototype.slice.call(document.querySelectorAll(".hlable mark.hl"));
}

export function openNotes(on) {
  el.notesPane.hidden = !on;
  const t = $("tHl");
  if (t) t.setAttribute("aria-pressed", String(!!on));
  if (on) paintNotes();
}

export function paintNotes() {
  if (el.notesPane.hidden) return;
  const marks = marksOnScreen();
  if (!marks.length) {
    el.notesList.innerHTML = '<p class="notespane-empty">Select any passage or question text, ' +
      "then choose a color. Use the pencil to attach a note.</p>";
    return;
  }
  el.notesList.innerHTML = marks.map((m) => {
    const hid = m.dataset.hid;
    const rec = state.hlNotes[hid];
    const tone = m.classList.contains("hl-blue") ? " blue"
      : m.classList.contains("hl-pink") ? " pink"
      : m.classList.contains("hl-under") ? " under" : "";
    return '<div class="ncard" data-card="' + esc(hid) + '">' +
      '<div class="nc-head' + tone + '"><span class="nc-quote">' + esc(m.textContent) + "</span>" +
      '<button class="nc-del" type="button" data-del="' + esc(hid) + '" title="Delete this note" aria-label="Delete this note">' +
      DEL_ICON + "</button></div>" +
      '<textarea data-note="' + esc(hid) + '" placeholder="Notes are saved automatically.">' +
      esc(rec ? rec.text : "") + "</textarea></div>";
  }).join("");
}

function focusCard(hid) {
  paintNotes();
  const card = el.notesList.querySelector('[data-card="' + hid + '"]');
  if (!card) return;
  if (activeCard) activeCard.classList.remove("active");
  card.classList.add("active");
  activeCard = card;
  const ta = card.querySelector("textarea");
  if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }
}

export function openHlList() { openNotes(el.notesPane.hidden); }

export function wireHighlights() {
  // Clicking the same words to deselect leaves no click the old guard could
  // catch, so the popup used to sit there. The selection itself is the signal.
  document.addEventListener("selectionchange", () => {
    if (hlAnchor) return;                       // editing an existing mark
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) hideHlBar();
  });

  document.addEventListener("mouseup", (e) => {
    if (e.target.closest(".hltoolbar") || e.target.closest(".notespane") ||
        e.target.closest(".delpop")) return;
    if (e.target.closest("mark.hl")) return;          // click handler deals with it
    const r = selectionInHlable();
    if (!r) { if (!el.hlToolbar.hidden) hideHlBar(); return; }
    showToolbarFor(r.getBoundingClientRect(), null);
    swallowClick = true;
  });

  el.hlToolbar.addEventListener("mousedown", (e) => e.preventDefault());
  el.hlToolbar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-hl]");
    if (!b || !cur()) return;
    const kind = b.getAttribute("data-hl");

    if (kind === "clear") {
      let target = hlAnchor;
      if (!target) {
        const r = selectionInHlable();
        if (r) {
          let n = r.commonAncestorContainer;
          if (n.nodeType !== 1) n = n.parentNode;
          target = n.closest ? n.closest("mark.hl") : null;
        }
      }
      unwrap(target);
      saveHl(); hideHlBar(); paintNotes();
      return;
    }

    if (kind === "note") {
      const m = hlAnchor || wrapSelection("yellow");
      if (!m) return;
      if (!state.hlNotes[m.dataset.hid]) {
        state.hlNotes[m.dataset.hid] = {
          qn: cur().number, quote: m.textContent.slice(0, 90), text: "",
        };
      }
      m.classList.add("hasnote");
      saveHl(); hideHlBar(); openNotes(true); focusCard(m.dataset.hid);
      return;
    }

    if (hlAnchor) {
      hlAnchor.className = "hl hl-" + kind +
        (state.hlNotes[hlAnchor.dataset.hid] ? " hasnote" : "");
    } else if (!wrapSelection(kind)) return;
    saveHl(); hideHlBar(); paintNotes();
  });

  document.addEventListener("click", (e) => {
    if (swallowClick) { swallowClick = false; return; }
    if (e.target.closest(".hltoolbar") || e.target.closest(".notespane") ||
        e.target.closest(".delpop")) return;
    const m = e.target.closest ? e.target.closest("mark.hl") : null;
    if (m) {
      showToolbarFor(m.getBoundingClientRect(), m);
      if (state.hlNotes[m.dataset.hid]) { openNotes(true); focusCard(m.dataset.hid); }
      return;
    }
    hideHlBar(); hideDelete();
  });

  el.notesClose.addEventListener("click", () => openNotes(false));

  el.notesList.addEventListener("input", (e) => {
    const ta = e.target.closest("[data-note]");
    if (!ta) return;
    const hid = ta.getAttribute("data-note");
    const m = document.querySelector('mark.hl[data-hid="' + hid + '"]');
    if (ta.value.trim()) {
      state.hlNotes[hid] = {
        qn: cur() ? cur().number : 0,
        quote: m ? m.textContent.slice(0, 90) : "",
        text: ta.value,
      };
      if (m) m.classList.add("hasnote");
    } else {
      delete state.hlNotes[hid];
      if (m) m.classList.remove("hasnote");
    }
    saveHl();
  });

  el.notesList.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      pendingDelete = del.getAttribute("data-del");
      placeFixed(el.delPop, del.getBoundingClientRect(), false);
      return;
    }
    const card = e.target.closest("[data-card]");
    if (card) {
      const m = document.querySelector('mark.hl[data-hid="' + card.getAttribute("data-card") + '"]');
      if (m && m.scrollIntoView) m.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });

  el.delNo.addEventListener("click", hideDelete);
  el.delYes.addEventListener("click", () => {
    if (pendingDelete) {
      unwrap(document.querySelector('mark.hl[data-hid="' + pendingDelete + '"]'));
      saveHl();
    }
    hideDelete();
    paintNotes();
  });
}
