/* KaTeX and MathLive.

   The single-file shell pulled both off a CDN and polled a global. They are npm
   dependencies now, so KaTeX is a static import (every question may contain
   math, so there is nothing to defer) and MathLive is loaded on demand — it is
   the single largest dependency and only `math` questions need it. */

import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

const DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\(", right: "\\)", display: false },
  { left: "\\[", right: "\\]", display: true },
];

export function typeset(root) {
  if (!root || typeof renderMathInElement !== "function") return;
  try {
    renderMathInElement(root, {
      delimiters: DELIMITERS,
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "option"],
    });
  } catch (e) { /* raw text stays visible, which beats a blank question */ }
}

/* MathLive registers the <math-field> custom element as an import side effect.
   Load it once; every math input awaits the same promise. A failure is not
   fatal — renderMath falls back to a plain text box with a symbol palette. */
let mlPromise = null;
export const mathlive = { state: "idle" };

export function loadMathLive() {
  if (mlPromise) return mlPromise;
  mathlive.state = "loading";
  mlPromise = import("mathlive")
    .then(() => {
      const ok = !!(window.customElements && customElements.get("math-field"));
      mathlive.state = ok ? "ready" : "failed";
      window.dispatchEvent(new Event(ok ? "mathlive-ready" : "mathlive-failed"));
      return ok;
    })
    .catch(() => {
      mathlive.state = "failed";
      window.dispatchEvent(new Event("mathlive-failed"));
      return false;
    });
  return mlPromise;
}
