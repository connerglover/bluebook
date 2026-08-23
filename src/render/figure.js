/* Figures.

   Two shapes, both self-contained so a .bbtest stays a single portable file:

     "figure": { "svg": "<svg viewBox=…>…</svg>", "alt": "…", "caption": "…" }
     "figure": { "src": "data:image/png;base64,…",  "alt": "…", "caption": "…" }

   A .bbtest is untrusted input — it arrives as a file the student picked off
   disk, and the app renders it into its own origin. Inline SVG is a script
   vector (<script>, on* handlers, <foreignObject>, javascript: hrefs), so
   everything is parsed and scrubbed before it reaches the document. Raster
   images are restricted to base64 data: URIs of known bitmap types, which is
   also why image/svg+xml is refused there: it would smuggle the same markup
   past the scrubber.

   `alt` is required. A figure nobody can describe is a figure a screen-reader
   user cannot answer. */

import { esc } from "../core/dom.js";

const ALLOWED_RASTER = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,[A-Za-z0-9+/=\s]+$/i;

const BANNED_TAGS = new Set([
  "script", "foreignobject", "iframe", "object", "embed", "audio", "video",
  "animate", "animatetransform", "animatemotion", "set", "handler", "listener",
]);

/** Strip anything executable out of an author-supplied SVG. */
export function sanitizeSvg(markup) {
  const doc = new DOMParser().parseFromString(String(markup || ""), "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName === "parsererror" || root.nodeName.toLowerCase() !== "svg") {
    return null;
  }

  const walk = (node) => {
    // Copy the child list first: the loop removes nodes as it goes.
    Array.prototype.slice.call(node.childNodes).forEach((child) => {
      if (child.nodeType === 1) {
        if (BANNED_TAGS.has(child.nodeName.toLowerCase())) {
          child.parentNode.removeChild(child);
          return;
        }
        Array.prototype.slice.call(child.attributes || []).forEach((attr) => {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || "");
          const isUrlish = name === "href" || name === "xlink:href" || name === "src";
          if (name.startsWith("on")) child.removeAttribute(attr.name);
          else if (isUrlish && !/^(#|data:image\/(png|jpeg|jpg|gif|webp|avif);base64,)/i.test(value)) {
            child.removeAttribute(attr.name);
          } else if (/url\s*\(\s*['"]?\s*(javascript|data):/i.test(value) && name === "style") {
            child.removeAttribute(attr.name);
          }
        });
        walk(child);
      } else if (child.nodeType === 8) {
        child.parentNode.removeChild(child);          // comments carry nothing useful
      }
    });
  };
  walk(root);

  root.setAttribute("role", "img");
  root.setAttribute("focusable", "false");
  if (!root.getAttribute("viewBox") && root.getAttribute("width") && root.getAttribute("height")) {
    root.setAttribute("viewBox", "0 0 " + root.getAttribute("width") + " " + root.getAttribute("height"));
  }
  // Let CSS drive the size; a fixed px width breaks zoom and narrow layout.
  root.removeAttribute("width");
  root.removeAttribute("height");

  return new XMLSerializer().serializeToString(root);
}

/**
 * Build a <figure> element, or null when the spec is unusable.
 * Never throws: a bad figure degrades to its caption rather than a blank page.
 */
export function renderFigure(fig) {
  if (!fig || typeof fig !== "object") return null;
  const alt = String(fig.alt || "").trim();
  const box = document.createElement("figure");
  box.className = "qfigure";

  let body = null;

  if (fig.svg) {
    const clean = sanitizeSvg(fig.svg);
    if (clean) {
      body = document.createElement("div");
      body.className = "qfigure-svg";
      body.innerHTML = clean;
      const svg = body.querySelector("svg");
      if (svg && alt) svg.setAttribute("aria-label", alt);
    }
  } else if (fig.src) {
    const src = String(fig.src).trim();
    if (ALLOWED_RASTER.test(src)) {
      body = document.createElement("img");
      body.className = "qfigure-img";
      body.src = src;
      body.alt = alt;
      body.loading = "lazy";
      if (fig.width) body.style.maxWidth = parseInt(fig.width, 10) + "px";
    }
  }

  if (!body) {
    // Say so plainly rather than leaving a hole the test-taker cannot explain.
    const warn = document.createElement("p");
    warn.className = "qfigure-missing";
    warn.textContent = alt
      ? "[Figure could not be displayed. Description: " + alt + "]"
      : "[This question refers to a figure that could not be displayed.]";
    box.appendChild(warn);
  } else {
    if (fig.maxWidth) box.style.maxWidth = parseInt(fig.maxWidth, 10) + "px";
    box.appendChild(body);
  }

  if (alt && body) {
    const sr = document.createElement("p");
    sr.className = "sr-only";
    sr.textContent = alt;
    box.appendChild(sr);
  }

  if (fig.caption) {
    const cap = document.createElement("figcaption");
    cap.innerHTML = esc(fig.caption);
    box.appendChild(cap);
  }

  return box;
}

/** A short text stand-in used by the results file, which carries no markup. */
export function describeFigure(fig) {
  if (!fig) return "";
  const alt = String(fig.alt || "").trim();
  const cap = String(fig.caption || "").trim();
  if (alt && cap) return "[Figure: " + alt + " — " + cap + "]";
  return "[Figure: " + (alt || cap || "no description supplied") + "]";
}
