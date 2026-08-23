/* The math answer box.

   Math entry behaves like a live formula editor: a palette, a field that renders
   as you type, and a preview underneath. MathLive drives it when it loads;
   otherwise the same palette writes LaTeX into a plain field and KaTeX renders
   the preview, so the box never degrades to a bare text input. */

import katex from "katex";
import { state } from "../core/state.js";
import { loadMathLive } from "../core/typeset.js";
import { paintNav } from "../ui/nav.js";
import { PLACEHOLDER, SAVE_NOTE, mode } from "./mode.js";

const MATH_PAL = [
  ["\\frac{#0}{#0}", "a⁄b", "Fraction"],
  ["^{#0}", "xⁿ", "Exponent"],
  ["_{#0}", "xₙ", "Subscript"],
  ["\\sqrt{#0}", "√", "Square root"],
  ["\\pi", "π", "Pi"],
  ["\\theta", "θ", "Theta"],
  ["\\infty", "∞", "Infinity"],
  ["\\pm", "±", "Plus or minus"],
  ["\\le", "≤", "Less than or equal"],
  ["\\ge", "≥", "Greater than or equal"],
  ["\\int_{#0}^{#0}", "∫", "Integral"],
  ["\\lim_{x\\to #0}", "lim", "Limit"],
];

/* Every mounted math box registers a remount here. When MathLive finishes
   loading they all swap from the fallback input to a live field — without this
   the first render wins permanently and every math box stays plain text. */
const mathMounts = [];

function renderPreview(node, latex) {
  if (!latex || !latex.trim()) {
    node.innerHTML = '<span class="ph">Your answer appears here as you type.</span>';
    return;
  }
  try {
    katex.render(latex, node, { throwOnError: false, displayMode: false });
    return;
  } catch (e) { /* fall through to raw */ }
  node.textContent = latex;
}

export function renderMath(q, key) {
  const outer = document.createElement("div");
  if (!mode.bare) {
    const note = document.createElement("p");
    note.className = "autosave";
    note.textContent = SAVE_NOTE;
    outer.appendChild(note);
  }

  const pal = document.createElement("div");
  pal.className = "mathpal";
  outer.appendChild(pal);

  const holder = document.createElement("div");
  outer.appendChild(holder);

  // MathLive renders as you type, so a second copy underneath is noise. The
  // preview only earns its place when the plain-text fallback is in use.
  const prev = document.createElement("div");
  prev.className = "mathprev";

  if (q.mathHint) {
    const h = document.createElement("p");
    h.className = "mathhint";
    h.textContent = q.mathHint;
    outer.appendChild(h);
  }

  function mount() {
    holder.innerHTML = "";
    pal.innerHTML = "";
    const live = window.customElements && customElements.get("math-field");

    if (live) {
      const f = document.createElement("math-field");
      f.setAttribute("virtual-keyboard-mode", "manual");
      f.setAttribute("placeholder", "\\text{" + PLACEHOLDER + "}");
      try { f.value = state.answers[key] || ""; } catch (e) { /* pre-upgrade */ }
      f.addEventListener("input", () => {
        state.answers[key] = f.value;
        renderPreview(prev, f.value);
        paintNav();
      });
      holder.appendChild(f);
      if (prev.parentNode) prev.parentNode.removeChild(prev);
      try {
        // Font Style / Color / Background do nothing useful here and only
        // invite fiddling, so trim the context menu to the items that work.
        if (Array.isArray(f.menuItems)) {
          f.menuItems = f.menuItems.filter((mi) => {
            const id = String((mi && (mi.id || mi.label)) || "").toLowerCase();
            return !/color|background|font/.test(id);
          });
        }
      } catch (e) { /* older builds expose no menu API */ }
      MATH_PAL.forEach((m) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = m[1]; b.title = m[2];
        b.addEventListener("click", () => {
          try { f.executeCommand(["insert", m[0]]); }
          catch (e) { try { f.insert(m[0]); } catch (e2) { /* give up quietly */ } }
          f.focus();
          state.answers[key] = f.value;
          renderPreview(prev, f.value);
          paintNav();
        });
        pal.appendChild(b);
      });
      renderPreview(prev, state.answers[key] || "");
      return;
    }

    const inp = document.createElement("input");
    inp.className = "mathfallback"; inp.type = "text";
    inp.placeholder = PLACEHOLDER;
    inp.value = state.answers[key] || "";
    if (!prev.parentNode) outer.insertBefore(prev, outer.querySelector(".mathhint"));
    const sync = () => {
      state.answers[key] = inp.value;
      renderPreview(prev, inp.value);
      paintNav();
    };
    inp.addEventListener("input", sync);
    holder.appendChild(inp);
    MATH_PAL.forEach((m) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = m[1]; b.title = m[2];
      b.addEventListener("click", () => {
        const at = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
        const frag = m[0].replace(/#0/g, "");
        inp.value = inp.value.slice(0, at) + frag + inp.value.slice(at);
        inp.focus();
        inp.setSelectionRange(at + frag.length, at + frag.length);
        sync();
      });
      pal.appendChild(b);
    });
    renderPreview(prev, state.answers[key] || "");
  }

  mount();
  mathMounts.push(mount);
  loadMathLive();
  return outer;
}

/* Set by the question screen so a successful MathLive load can repaint. */
const hooks = { onReady: null };
export function setMathHooks(h) { Object.assign(hooks, h); }

export function wireMath() {
  window.addEventListener("mathlive-ready", () => {
    while (mathMounts.length) {
      try { mathMounts.pop()(); } catch (e) { /* a dead node is fine to skip */ }
    }
    if (hooks.onReady) hooks.onReady();
  });
}
