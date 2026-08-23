/* The answer-key builder.

   Takes a .bbtest and a plaintext key, and returns the hashed key block to drop
   into the file — or writes the keyed file outright. Everything runs in this
   page: the plaintext never goes anywhere, and no server is involved.

   It lives on its own HTML entry so nothing here can end up in the bundle the
   test-taker loads. */

import "./author.css";
import { canonicalFromPlain, hashAnswer, isScorable, newSalt } from "../scoring/hash.js";
import { validateTest } from "../loader/validate.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const st = { data: null, fileName: "", questions: [], built: null };

const TYPE_HINT = {
  mcq: "one letter", truefalse: "A (true) or B (false)", multi: "letters, e.g. A,C",
  dropdown: "letter of the option", matching: "e.g. 1-A, 2-C",
};

/** Flatten the test to the questions that can actually be scored. */
function scorableQuestions(data) {
  const out = [];
  let n = 0;
  (data.sections || []).forEach((sec) => {
    (sec.questions || []).forEach((q) => {
      n += 1;
      const id = q.id || ("q" + n);
      const type = q.type || "mcq";
      if (!isScorable(type)) return;
      const choices = type === "truefalse" ? ["True", "False"]
        : type === "dropdown" ? (q.options || [])
        : (q.choices || []);
      out.push({
        id, number: n, type, section: sec.name || "",
        prompt: String(q.prompt || "").slice(0, 120),
        choices,
        left: (q.left || []).length,
        right: (q.right || []).length,
      });
    });
  });
  return out;
}

function showLoadError(msg, detail) {
  const box = $("loadErr");
  box.hidden = false;
  box.innerHTML = "<strong>" + esc(msg) + "</strong>" +
    (detail ? '<span class="au-detail">' + esc(detail) + "</span>" : "");
}

function renderRows() {
  const rows = $("rows");
  if (!st.questions.length) {
    rows.innerHTML = '<p class="au-hint">This test has no questions that can be auto-scored. ' +
      "Only mcq, truefalse, multi, dropdown and matching have a fixed set of choices.</p>";
    return;
  }
  rows.innerHTML = st.questions.map((q) => {
    const range = q.type === "matching"
      ? q.left + " left, " + q.right + " right"
      : q.choices.length ? "A–" + String.fromCharCode(64 + q.choices.length) : "";
    return '<div class="au-row">' +
      '<span class="au-n">' + q.number + "</span>" +
      '<span class="au-meta"><code>' + esc(q.id) + "</code>" +
      '<span class="au-type">' + esc(q.type) + (range ? " · " + esc(range) : "") + "</span>" +
      '<span class="au-prompt">' + esc(q.prompt) + "</span></span>" +
      '<input class="au-ans" data-id="' + esc(q.id) + '" ' +
      'placeholder="' + esc(TYPE_HINT[q.type] || "") + '" spellcheck="false" autocomplete="off">' +
      '<span class="au-state" data-state="' + esc(q.id) + '"></span>' +
      "</div>";
  }).join("");

  rows.addEventListener("input", (e) => {
    const inp = e.target.closest(".au-ans");
    if (!inp) return;
    markRow(inp);
    updateCount();
  });
}

function markRow(inp) {
  const id = inp.getAttribute("data-id");
  const q = st.questions.find((x) => x.id === id);
  const cell = document.querySelector('[data-state="' + CSS.escape(id) + '"]');
  const raw = inp.value.trim();
  if (!raw) { cell.textContent = ""; cell.className = "au-state"; inp.classList.remove("bad"); return; }
  const canon = canonicalFromPlain(q.type, raw);
  const valid = canon && withinRange(q, canon);
  cell.textContent = valid ? canon : "?";
  cell.className = "au-state " + (valid ? "good" : "bad");
  inp.classList.toggle("bad", !valid);
}

/** Reject a letter the question does not actually offer. */
function withinRange(q, canon) {
  const maxLetter = (n) => String.fromCharCode(64 + n);
  if (q.type === "matching") {
    const parts = canon.split(",");
    if (parts.length !== q.left) return false;
    return parts.every((p) => {
      const [num, L] = p.split("-");
      return parseInt(num, 10) >= 1 && parseInt(num, 10) <= q.left &&
        L <= maxLetter(q.right) && L >= "A";
    });
  }
  const n = q.choices.length;
  if (!n) return true;
  const letters = canon.split(",");
  return letters.every((L) => L >= "A" && L <= maxLetter(n));
}

function updateCount() {
  const inputs = Array.from(document.querySelectorAll(".au-ans"));
  const filled = inputs.filter((i) => i.value.trim()).length;
  const bad = inputs.filter((i) => i.classList.contains("bad")).length;
  $("keyCount").textContent = filled + " of " + inputs.length + " keyed" +
    (bad ? " · " + bad + " not understood" : "");
  $("keyCount").className = "au-count" + (bad ? " bad" : "");
}

function collect() {
  const out = [];
  document.querySelectorAll(".au-ans").forEach((inp) => {
    const raw = inp.value.trim();
    if (!raw) return;
    const id = inp.getAttribute("data-id");
    const q = st.questions.find((x) => x.id === id);
    const canon = canonicalFromPlain(q.type, raw);
    if (canon && withinRange(q, canon)) out.push({ id, canon });
  });
  return out;
}

async function build() {
  const entries = collect();
  if (!entries.length) {
    showOk("Nothing to build — no answers were entered.", true);
    return;
  }
  const salt = newSalt();
  const answers = {};
  for (let i = 0; i < entries.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    answers[entries[i].id] = await hashAnswer(salt, entries[i].id, entries[i].canon);
  }
  const key = { algo: "sha256-v1", salt, answers };
  st.built = key;

  const block = JSON.stringify({ key }, null, 2);
  const out = $("output");
  out.hidden = false;
  out.value = block.replace(/^\{\n/, "").replace(/\n\}$/, "")
    .split("\n").map((l) => l.replace(/^ {2}/, "")).join("\n");
  $("copyBtn").hidden = false;
  $("saveBtn").hidden = false;
  showOk("Built a key for " + entries.length + " question" + (entries.length === 1 ? "" : "s") + ".");
}

function showOk(msg, bad) {
  const o = $("okMsg");
  o.textContent = msg;
  o.hidden = false;
  o.className = "au-ok" + (bad ? " bad" : "");
}

function saveKeyed() {
  if (!st.built) return;
  const copy = JSON.parse(JSON.stringify(st.data));
  copy.key = st.built;
  copy.meta = copy.meta || {};
  copy.meta.scoreReveal = $("revealSel").value;

  const text = JSON.stringify(copy, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const base = (st.fileName || "test.bbtest").replace(/\.(bbtest|json)$/i, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = base + "-keyed.bbtest";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  showOk("Saved " + a.download);
}

function applyPaste() {
  const text = $("pasteArea").value;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const byId = {};
  const bare = [];
  lines.forEach((line) => {
    const m = /^([A-Za-z0-9_-]+)\s*[:.)]\s*(.+)$/.exec(line);
    if (m && st.questions.some((q) => q.id === m[1])) byId[m[1]] = m[2].trim();
    else if (m && /^\d+$/.test(m[1])) {
      const q = st.questions.find((x) => x.number === parseInt(m[1], 10));
      if (q) byId[q.id] = m[2].trim(); else bare.push(line);
    } else bare.push(line);
  });
  // Anything unlabelled fills the remaining rows in order.
  let bi = 0;
  document.querySelectorAll(".au-ans").forEach((inp) => {
    const id = inp.getAttribute("data-id");
    if (byId[id] != null) inp.value = byId[id];
    else if (bi < bare.length && !Object.keys(byId).length) { inp.value = bare[bi]; bi += 1; }
    markRow(inp);
  });
  updateCount();
}

function onLoaded(data, fileName) {
  const report = validateTest(data);
  if (!report.ok) {
    showLoadError("That test file has problems that stop it loading.", report.errors.join("\n"));
    return;
  }
  st.data = data;
  st.fileName = fileName;
  st.questions = scorableQuestions(data);

  const meta = data.meta || {};
  $("loaded").hidden = false;
  $("loaded").innerHTML =
    "<strong>" + esc(meta.title || "Untitled test") + "</strong>" +
    (meta.course ? " · " + esc(meta.course) : "") +
    "<span>" + report.questionCount + " questions, " + st.questions.length + " of them auto-scorable</span>" +
    (data.key ? '<span class="au-warn">This file already carries a key. Building a new one replaces it.</span>' : "") +
    (report.warnings.length
      ? '<span class="au-warn">' + report.warnings.length + " warning" +
        (report.warnings.length === 1 ? "" : "s") + ": " + esc(report.warnings[0]) + "</span>"
      : "");

  $("keyCard").hidden = false;
  $("outCard").hidden = false;
  if (meta.scoreReveal) $("revealSel").value = meta.scoreReveal;
  renderRows();
  updateCount();
}

function init() {
  $("pickBtn").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", () => {
    const f = $("fileInput").files && $("fileInput").files[0];
    $("fileInput").value = "";
    if (!f) return;
    $("loadErr").hidden = true;
    const r = new FileReader();
    r.onerror = () => showLoadError("That file could not be read.");
    r.onload = () => {
      try {
        onLoaded(JSON.parse(String(r.result || "")), f.name);
      } catch (e) {
        showLoadError("That file is not valid JSON.", e.message);
      }
    };
    r.readAsText(f);
  });

  $("fillDemo").addEventListener("click", () => {
    const box = $("pasteBox");
    box.hidden = !box.hidden;
  });
  $("applyPaste").addEventListener("click", applyPaste);
  $("buildBtn").addEventListener("click", () => { build(); });
  $("saveBtn").addEventListener("click", saveKeyed);
  $("copyBtn").addEventListener("click", async () => {
    const out = $("output");
    try {
      await navigator.clipboard.writeText(out.value);
      showOk("Copied the key block.");
    } catch (e) {
      out.focus();
      out.select();
      showOk("Selected — press Ctrl/Cmd+C.");
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
