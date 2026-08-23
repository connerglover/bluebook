/* dropdown and matching — the two menu-driven types. */

import { LETTER, esc, richHTML } from "../core/dom.js";
import { state } from "../core/state.js";
import { paintNav } from "../ui/nav.js";

export function renderDropdown(q, key) {
  const box = document.createElement("div");
  const sel = document.createElement("select");
  sel.className = "sel";
  sel.innerHTML = '<option value="">Choose…</option>' + (q.options || []).map((o, i) =>
    '<option value="' + i + '"' + (state.answers[key] === i ? " selected" : "") + ">" + esc(o) + "</option>"
  ).join("");
  sel.addEventListener("change", () => {
    if (sel.value === "") delete state.answers[key];
    else state.answers[key] = parseInt(sel.value, 10);
    paintNav();
  });
  box.appendChild(sel);
  return box;
}

export function renderMatching(q, key) {
  const v = state.answers[key] || {};
  const box = document.createElement("div");
  box.className = "matchgrid";
  (q.left || []).forEach((L, i) => {
    const row = document.createElement("div");
    row.className = "matchrow";
    row.innerHTML = '<div class="mleft">' + richHTML(L) + "</div>";
    const sel = document.createElement("select");
    sel.className = "sel";
    sel.innerHTML = '<option value="">Choose…</option>' + (q.right || []).map((R, j) =>
      '<option value="' + j + '"' + (v[i] === j ? " selected" : "") + ">" + LETTER(j) + ". " + esc(R) + "</option>"
    ).join("");
    sel.addEventListener("change", () => {
      const nv = Object.assign({}, state.answers[key] || {});
      if (sel.value === "") delete nv[i]; else nv[i] = parseInt(sel.value, 10);
      state.answers[key] = nv;
      paintNav();
    });
    row.appendChild(sel);
    box.appendChild(row);
  });
  return box;
}
