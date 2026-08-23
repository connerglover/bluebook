/* Small helpers shared by every other module. Nothing in here touches app
   state, which is what makes it safe to import from anywhere. */

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const LETTER = (i) => String.fromCharCode(65 + i);
export const PART = (i) => "(" + String.fromCharCode(97 + i) + ")";

let uidN = 0;
export function uid() { uidN += 1; return "h" + uidN; }

// Prompt text is authored as plain text with $math$. Escape the text,
// keep the math delimiters, then let KaTeX typeset in place.
export function richHTML(src) {
  const t = esc(src == null ? "" : src);
  return t.split(/\n{2,}/).map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
}

export function htmlToText(html) {
  if (html == null) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}

export function clearNode(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function elem(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
