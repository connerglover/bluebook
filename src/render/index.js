/* The renderer registry.

   One entry per question type. `parts` and `fields` are handled by the question
   screen and by renderFields below rather than living here, because they
   compose other types rather than rendering an input of their own. */

import { renderMcq, renderMulti } from "./choice.js";
import { renderDropdown, renderMatching } from "./select.js";
import { renderEssay, renderFill, renderShort } from "./text.js";
import { renderMath } from "./math.js";
import { mode, noteInto } from "./mode.js";

export const RENDER = {
  mcq: renderMcq,
  truefalse: renderMcq,
  multi: renderMulti,
  dropdown: renderDropdown,
  matching: renderMatching,
  fill: renderFill,
  short: renderShort,
  essay: renderEssay,
  math: renderMath,
};

export function renderSlot(def, key, type) {
  const fn = RENDER[type] || RENDER.short;
  return fn(def, key);
}

/* Types short enough to sit on one line beside their label. */
const TIGHT = { short: 1, dropdown: 1, truefalse: 1 };

export function renderFields(def, base) {
  const box = noteInto(document.createElement("div"));
  const set = document.createElement("div");
  set.className = "fieldset";
  (def.fields || []).forEach((f, j) => {
    const t = f.type || "short";
    const row = document.createElement("div");
    row.className = "fieldrow" + (TIGHT[t] ? " tight" : "");
    if (f.label) {
      const lab = document.createElement("p");
      lab.className = "flabel";
      lab.textContent = f.label;
      row.appendChild(lab);
    }
    const was = mode.bare;
    mode.bare = true;
    row.appendChild(renderSlot(f, base + "::" + j, t));
    mode.bare = was;
    set.appendChild(row);
  });
  box.appendChild(set);
  return box;
}
