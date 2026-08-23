/* Turning a stored answer into something a human (or Claude) can read.

   The runtime stores choices as indices and essays as HTML. Neither is much use
   to a grader, so every answer is rendered to a short string here. */

import { LETTER, PART, htmlToText } from "../core/dom.js";
import { blankCount } from "../core/answers.js";
import { state } from "../core/state.js";

export function describe(q, key, type, def) {
  const v = state.answers[key];
  if (type === "mcq" || type === "truefalse") {
    return typeof v === "number"
      ? LETTER(v) + (type === "truefalse" ? " (" + def.choices[v] + ")" : "")
      : "BLANK";
  }
  if (type === "multi") return Array.isArray(v) && v.length ? v.map(LETTER).join(", ") : "BLANK";
  if (type === "dropdown") return typeof v === "number" ? (def.options || [])[v] : "BLANK";
  if (type === "matching") {
    const n = (def.left || []).length;
    const out = [];
    for (let i = 0; i < n; i += 1) {
      out.push((i + 1) + "->" + (typeof (v || {})[i] === "number" ? LETTER(v[i]) : "?"));
    }
    return out.join(", ");
  }
  if (type === "fill") {
    const n = blankCount(def);
    const arr = [];
    for (let i = 0; i < n; i += 1) {
      arr.push("[" + (String((v || [])[i] || "").trim() || "BLANK") + "]");
    }
    return arr.join(" ");
  }
  if (type === "essay") { const t = htmlToText(v); return t || "BLANK"; }
  return String(v || "").trim() || "BLANK";
}

/* A field group prints as "Label = value" pairs so the grader can tell which
   answer belongs to which thing the prompt asked for. */
export function describeFields(def, base) {
  const bits = (def.fields || []).map((f, j) => {
    const v = describe(f, base + "::" + j, f.type || "short", f);
    return (f.label ? f.label + " = " : "") + v;
  });
  const oneLine = bits.join("; ");
  if (oneLine.indexOf("\n") < 0 && oneLine.length <= 96) return oneLine;
  return bits.join("\n");
}

/** Every answer on one question, as the results file records it. */
export function describeQuestion(q) {
  if (q.type === "parts") {
    return (q.parts || []).map((part, i) => {
      const pt = part.type || "short";
      const value = pt === "fields"
        ? describeFields(part, q.id + "::" + i)
        : describe(q, q.id + "::" + i, pt, part);
      return { part: PART(i), label: part.label || null, type: pt, value };
    });
  }
  if (q.type === "fields") return describeFields(q, q.id);
  return describe(q, q.id, q.type, q);
}
