/* mcq, truefalse and multi — everything driven by a lettered choice list. */

import { LETTER, richHTML } from "../core/dom.js";
import { state } from "../core/state.js";
import { drawQuestion } from "../ui/question.js";

export function choiceList(q, key, opts) {
  const multi = opts && opts.multi;
  const v = state.answers[key];
  const struck = state.struck[key] || {};
  const wrap = document.createElement("div");
  wrap.className = "choices" + (multi ? " multi" : "") + (state.elim ? " elim" : "");

  (q.choices || []).forEach((c, i) => {
    const on = multi ? (Array.isArray(v) && v.indexOf(i) >= 0) : (v === i);
    const row = document.createElement("div");
    row.className = "crow";
    row.innerHTML =
      '<button type="button" class="choice' + (struck[i] ? " struck" : "") + '" ' +
        (multi ? 'aria-pressed="' + on + '"' : 'role="radio" aria-checked="' + on + '"') +
        ' data-pick="' + i + '"><span class="letter">' + LETTER(i) + "</span>" +
        '<span class="body">' + richHTML(c) + "</span></button>" +
      '<button type="button" class="strikebtn' + (struck[i] ? " undo" : "") + '" data-strike="' + i + '" ' +
        'aria-label="' + (struck[i] ? "Undo cross out " : "Cross out ") + LETTER(i) + '">' +
        (struck[i] ? "Undo" : LETTER(i)) + "</button>";
    wrap.appendChild(row);
  });

  wrap.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) {
      const i = parseInt(p.getAttribute("data-pick"), 10);
      if (multi) {
        const arr = Array.isArray(state.answers[key]) ? state.answers[key].slice() : [];
        const at = arr.indexOf(i);
        if (at >= 0) arr.splice(at, 1); else arr.push(i);
        arr.sort((a, b) => a - b);
        state.answers[key] = arr;
      } else {
        state.answers[key] = state.answers[key] === i ? undefined : i;
        if (state.answers[key] === undefined) delete state.answers[key];
      }
      drawQuestion();
      return;
    }
    const s = e.target.closest("[data-strike]");
    if (s) {
      const i = parseInt(s.getAttribute("data-strike"), 10);
      if (!state.struck[key]) state.struck[key] = {};
      const turningOn = !state.struck[key][i];
      if (turningOn) state.struck[key][i] = true; else delete state.struck[key][i];
      // ruling a choice out means you no longer pick it
      if (turningOn) {
        if (multi) {
          const arr = Array.isArray(state.answers[key]) ? state.answers[key].slice() : [];
          const at = arr.indexOf(i);
          if (at >= 0) { arr.splice(at, 1); state.answers[key] = arr; }
        } else if (state.answers[key] === i) {
          delete state.answers[key];
        }
      }
      drawQuestion();
    }
  });

  return wrap;
}

export function renderMcq(q, key) { return choiceList(q, key, { multi: false }); }

export function renderMulti(q, key) {
  const box = document.createElement("div");
  const hint = document.createElement("p");
  hint.className = "field-label";
  hint.textContent = "SELECT ALL THAT APPLY";
  box.appendChild(hint);
  box.appendChild(choiceList(q, key, { multi: true }));
  return box;
}
