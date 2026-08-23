/* Answer slots and the answered/unanswered rules.

   A prompt that asks for three things needs three places to answer. `fields`
   is that: a labelled group of inputs sitting under one prompt, usable either
   as a question type or as the type of a single part. Everything that needs to
   know "is this question done" goes through slots(). */

import { htmlToText } from "./dom.js";
import { Q, state } from "./state.js";

export function fieldSlots(def, base) {
  return (def.fields || []).map((f, j) => ({
    key: base + "::" + j, type: f.type || "short", def: f,
  }));
}

export function slots(q) {
  if (q.type === "parts") {
    const out = [];
    (q.parts || []).forEach((p, i) => {
      if ((p.type || "short") === "fields") {
        fieldSlots(p, q.id + "::" + i).forEach((s) => out.push(s));
      } else {
        out.push({ key: q.id + "::" + i, type: p.type || "short", def: p });
      }
    });
    return out;
  }
  if (q.type === "fields") return fieldSlots(q, q.id);
  return [{ key: q.id, type: q.type, def: q }];
}

export function blankCount(q) {
  return (String(q.prompt || "").match(/___/g) || []).length || 1;
}

export function isFilled(type, v, def) {
  if (v == null) return false;
  if (type === "mcq" || type === "dropdown" || type === "truefalse") return typeof v === "number";
  if (type === "multi") return Array.isArray(v) && v.length > 0;
  if (type === "matching") {
    const n = (def.left || []).length;
    if (!v || typeof v !== "object") return false;
    for (let k = 0; k < n; k += 1) if (typeof v[k] !== "number") return false;
    return n > 0;
  }
  if (type === "fill") {
    if (!Array.isArray(v)) return false;
    const n = blankCount(def);
    for (let k = 0; k < n; k += 1) if (!String(v[k] || "").trim()) return false;
    return true;
  }
  if (type === "essay") return !!htmlToText(v).trim();
  return !!String(v).trim();
}

export function answered(q) {
  return slots(q).every((s) => isFilled(s.type, state.answers[s.key], s.def));
}

export function touched(q) {
  return slots(q).some((s) => isFilled(s.type, state.answers[s.key], s.def));
}

export const countAnswered = () => Q.filter(answered).length;
