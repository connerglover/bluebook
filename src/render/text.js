/* fill, short and essay — the plain-text answer types. */

import { esc } from "../core/dom.js";
import { blankCount } from "../core/answers.js";
import { state } from "../core/state.js";
import { paintNav } from "../ui/nav.js";
import { PLACEHOLDER, mode, noteInto, withNote } from "./mode.js";

export function renderFill(q, key) {
  const n = blankCount(q);
  const vals = Array.isArray(state.answers[key]) ? state.answers[key] : new Array(n).fill("");
  state.answers[key] = vals;
  const box = document.createElement("div");
  box.className = "fillline";
  const chunks = String(q.prompt || "").split("___");
  chunks.forEach((chunk, i) => {
    const span = document.createElement("span");
    span.innerHTML = esc(chunk);
    box.appendChild(span);
    if (i < chunks.length - 1) {
      const inp = document.createElement("input");
      inp.className = "blank"; inp.type = "text"; inp.value = vals[i] || "";
      inp.setAttribute("aria-label", (q.blankHints && q.blankHints[i]) || ("Blank " + (i + 1)));
      inp.addEventListener("input", () => { vals[i] = inp.value; paintNav(); });
      box.appendChild(inp);
    }
  });
  return box;
}

export function renderShort(q, key) {
  const inp = document.createElement("input");
  inp.className = "shortinput"; inp.type = "text";
  inp.placeholder = PLACEHOLDER;
  inp.value = state.answers[key] || "";
  inp.addEventListener("input", () => { state.answers[key] = inp.value; paintNav(); });
  return withNote(inp);
}

const SYMBOLS = ["±", "×", "÷", "≤", "≥", "≠", "≈", "√", "π", "θ", "Δ", "∞", "°", "∑", "∫", "→",
  "α", "β", "μ", "σ", "λ", "Ω", "∈", "⊂"];

export function renderEssay(q, key) {
  const box = noteInto(document.createElement("div"));

  const wrap = document.createElement("div");
  wrap.className = "editor-wrap";
  const bar = document.createElement("div");
  bar.className = "editor-bar";
  const ed = document.createElement("div");
  ed.className = "editor"; ed.contentEditable = "true";
  ed.setAttribute("data-ph", PLACEHOLDER);
  ed.setAttribute("role", "textbox"); ed.setAttribute("aria-multiline", "true");
  ed.innerHTML = state.answers[key] || "";

  const cmd = (c, label, title) => {
    const b = document.createElement("button");
    b.type = "button"; b.innerHTML = label; b.title = title || c;
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      ed.focus();
      try { document.execCommand(c, false, null); } catch (e) { /* unsupported */ }
      state.answers[key] = ed.innerHTML;
      paintNav();
    });
    bar.appendChild(b);
    return b;
  };
  cmd("bold", "<b>B</b>", "Bold");
  cmd("italic", "<i>I</i>", "Italic");
  cmd("underline", "<u>U</u>", "Underline");

  const sym = document.createElement("button");
  sym.type = "button"; sym.innerHTML = "Ω"; sym.title = "Insert symbol";
  sym.addEventListener("click", (e) => {
    e.stopPropagation();
    const pop = document.createElement("div");
    pop.className = "symbolpop";
    const r = sym.getBoundingClientRect();
    pop.style.left = r.left + "px";
    pop.style.top = (r.bottom + 6) + "px";
    SYMBOLS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = s;
      b.addEventListener("click", () => {
        ed.focus();
        try { document.execCommand("insertText", false, s); } catch (err) { ed.innerHTML += s; }
        state.answers[key] = ed.innerHTML;
        pop.remove();
        paintNav();
      });
      pop.appendChild(b);
    });
    document.body.appendChild(pop);
    setTimeout(() => {
      document.addEventListener("click", function once() {
        pop.remove();
        document.removeEventListener("click", once);
      });
    }, 0);
  });
  bar.appendChild(sym);

  const sep = () => {
    const s = document.createElement("span");
    s.className = "sep";
    bar.appendChild(s);
  };
  sep();
  cmd("undo", "↶", "Undo"); cmd("redo", "↷", "Redo");
  sep();
  cmd("superscript", "x²", "Superscript"); cmd("subscript", "x₂", "Subscript");
  cmd("insertUnorderedList", "☰", "Bulleted list");

  ed.addEventListener("input", () => { state.answers[key] = ed.innerHTML; paintNav(); });
  wrap.appendChild(bar); wrap.appendChild(ed); box.appendChild(wrap);
  return box;
}

/* Re-exported so the registry can reach the flag without a second import. */
export { mode };
