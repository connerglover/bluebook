/* The built-in calculator: a CALC tab with a keypad and history, and a GRAPH
   tab that plots up to three expressions on a canvas.

   This is the offline fallback for when the TI-84 cannot start. KEYS drives the
   keypad — it lives here beside the code that reads it, because it once sat
   between two functions and got deleted by a careless cut. */

import { $, esc } from "../core/dom.js";
import { el } from "../core/state.js";
import { evalExpr, fmtNum } from "./eval.js";
import { calcState, drawCalc } from "./panel.js";

const KEYS = [
  ["2nd", "k-2nd", "second"], ["DEG", "k-fn", "angle"], ["(", "k-fn", "ins", "("], [")", "k-fn", "ins", ")"], ["DEL", "k-clr", "del"],
  ["sin", "k-fn", "ins", "sin("], ["cos", "k-fn", "ins", "cos("], ["tan", "k-fn", "ins", "tan("], ["^", "k-op", "ins", "^"], ["CLR", "k-clr", "clear"],
  ["ln", "k-fn", "ins", "ln("], ["7", "k-num", "ins", "7"], ["8", "k-num", "ins", "8"], ["9", "k-num", "ins", "9"], ["÷", "k-op", "ins", "/"],
  ["log", "k-fn", "ins", "log("], ["4", "k-num", "ins", "4"], ["5", "k-num", "ins", "5"], ["6", "k-num", "ins", "6"], ["×", "k-op", "ins", "*"],
  ["√", "k-fn", "ins", "√("], ["1", "k-num", "ins", "1"], ["2", "k-num", "ins", "2"], ["3", "k-num", "ins", "3"], ["−", "k-op", "ins", "-"],
  ["x²", "k-fn", "ins", "^2"], ["0", "k-num", "ins", "0"], [".", "k-num", "ins", "."], ["π", "k-fn", "ins", "π"], ["+", "k-op", "ins", "+"],
  ["eˣ", "k-fn", "ins", "exp("], ["Ans", "k-fn", "ins", "Ans"], ["x", "k-fn", "ins", "x"], ["ENTER", "k-eq", "enter"],
];

export function drawHomeTab() {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div class="lcd" id="lcd"></div>' +
    '<div class="entry"><input id="calcIn" placeholder="Type or tap keys" autocomplete="off" spellcheck="false"></div>' +
    '<div class="keys" id="keys"></div>';
  el.calcBody.appendChild(wrap);

  const input = $("calcIn");
  const keys = $("keys");
  KEYS.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = k[1];
    b.textContent = k[0] === "DEG" ? (calcState.deg ? "DEG" : "RAD") : k[0];
    b.addEventListener("click", () => {
      if (k[2] === "ins") { input.value += k[3]; input.focus(); }
      else if (k[2] === "del") input.value = input.value.slice(0, -1);
      else if (k[2] === "clear") { input.value = ""; calcState.hist = []; paintLcd(); }
      else if (k[2] === "angle") { calcState.deg = !calcState.deg; b.textContent = calcState.deg ? "DEG" : "RAD"; }
      else if (k[2] === "second") { calcState.second = !calcState.second; drawCalc(); }
      else if (k[2] === "enter") runCalc(input);
    });
    keys.appendChild(b);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runCalc(input); }
  });
  paintLcd();
}

export function paintLcd() {
  const lcd = $("lcd");
  if (!lcd) return;
  lcd.innerHTML = calcState.hist.length
    ? calcState.hist.map((h) =>
      '<div class="ln">' + esc(h.q) + '</div><div class="ln ans' + (h.err ? " err" : "") + '">' + esc(h.a) + "</div>"
    ).join("")
    : '<div class="ln" style="opacity:.6">Ready</div>';
  lcd.scrollTop = lcd.scrollHeight;
}

export function runCalc(input) {
  const src = input.value.trim();
  if (!src) return;
  try {
    const v = evalExpr(src, { deg: calcState.deg, Ans: calcState.ans });
    if (!isFinite(v)) throw new Error("undefined");
    calcState.ans = v;
    calcState.hist.push({ q: src, a: fmtNum(v) });
  } catch (e) {
    calcState.hist.push({ q: src, a: "SYNTAX ERROR", err: true });
  }
  if (calcState.hist.length > 40) calcState.hist.shift();
  input.value = "";
  paintLcd();
}

export function drawGraphTab() {
  const w = calcState.win;
  const wrap = document.createElement("div");
  wrap.className = "gwrap";
  wrap.innerHTML =
    calcState.ys.map((y, i) =>
      '<div class="yrow"><label for="y' + i + '">Y' + (i + 1) + "=</label>" +
      '<input id="y' + i + '" value="' + esc(y) + '" placeholder="expression in x" autocomplete="off" spellcheck="false"></div>'
    ).join("") +
    '<div class="gctl">' +
      '<input id="gxmin" value="' + w.xmin + '" aria-label="x minimum">' +
      '<input id="gxmax" value="' + w.xmax + '" aria-label="x maximum">' +
      '<input id="gymin" value="' + w.ymin + '" aria-label="y minimum">' +
      '<input id="gymax" value="' + w.ymax + '" aria-label="y maximum">' +
    "</div>" +
    '<div class="gbtns"><button type="button" id="gDraw">Graph</button>' +
    '<button type="button" id="gStd">Standard</button><button type="button" id="gFit">Fit Y</button></div>' +
    '<canvas class="gcanvas" id="gcanvas" width="600" height="424"></canvas>' +
    '<div class="trace" id="gtrace">Move over the plot to read values.</div>';
  el.calcBody.appendChild(wrap);

  const readY = () => { calcState.ys = [0, 1, 2].map((i) => $("y" + i).value); };
  const readWin = () => {
    ["xmin", "xmax", "ymin", "ymax"].forEach((k) => {
      const n = parseFloat($("g" + k).value);
      if (isFinite(n)) w[k] = n;
    });
  };

  $("gDraw").addEventListener("click", () => { readY(); readWin(); plot(); });
  $("gStd").addEventListener("click", () => {
    w.xmin = -10; w.xmax = 10; w.ymin = -10; w.ymax = 10;
    ["xmin", "xmax", "ymin", "ymax"].forEach((k) => { $("g" + k).value = w[k]; });
    readY();
    plot();
  });
  $("gFit").addEventListener("click", () => {
    readY(); readWin();
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 200; i += 1) {
      const x = w.xmin + (w.xmax - w.xmin) * i / 200;
      calcState.ys.forEach((src) => {
        if (!src.trim()) return;
        try {
          const y = evalExpr(src, { deg: calcState.deg, Ans: calcState.ans, x });
          if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
        } catch (e) { /* a hole in the domain is not an error here */ }
      });
    }
    if (isFinite(lo) && isFinite(hi) && hi > lo) {
      const pad = (hi - lo) * 0.1 || 1;
      w.ymin = lo - pad;
      w.ymax = hi + pad;
      $("gymin").value = Math.round(w.ymin * 100) / 100;
      $("gymax").value = Math.round(w.ymax * 100) / 100;
    }
    plot();
  });
  [0, 1, 2].forEach((i) => {
    $("y" + i).addEventListener("keydown", (e) => {
      if (e.key === "Enter") { readY(); readWin(); plot(); }
    });
  });

  const cv = $("gcanvas");
  cv.addEventListener("mousemove", (e) => {
    const r = cv.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const x = w.xmin + px * (w.xmax - w.xmin);
    const parts = [];
    calcState.ys.forEach((src, i) => {
      if (!src.trim()) return;
      try {
        const y = evalExpr(src, { deg: calcState.deg, Ans: calcState.ans, x });
        if (isFinite(y)) parts.push("Y" + (i + 1) + "=" + fmtNum(y));
      } catch (err) { /* off the domain */ }
    });
    $("gtrace").textContent = "x=" + fmtNum(x) + (parts.length ? "   " + parts.join("   ") : "");
  });

  plot();
}

const PLOT_COLORS = ["#12180d", "#1f4fa8", "#a32b2b"];

export function plot() {
  const cv = $("gcanvas");
  if (!cv || !cv.getContext) return;
  const g = cv.getContext("2d");
  if (!g) return;                      // no 2d context available here
  const W = cv.width, H = cv.height, w = calcState.win;
  const X = (x) => (x - w.xmin) / (w.xmax - w.xmin) * W;
  const Y = (y) => H - (y - w.ymin) / (w.ymax - w.ymin) * H;

  g.clearRect(0, 0, W, H);
  g.fillStyle = "#c6d3b4";
  g.fillRect(0, 0, W, H);

  g.strokeStyle = "rgba(0,0,0,.14)";
  g.lineWidth = 1;
  const step = (span) => {
    const raw = span / 10;
    const p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
  };
  const sx = step(w.xmax - w.xmin), sy = step(w.ymax - w.ymin);
  for (let x = Math.ceil(w.xmin / sx) * sx; x <= w.xmax; x += sx) {
    g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke();
  }
  for (let y = Math.ceil(w.ymin / sy) * sy; y <= w.ymax; y += sy) {
    g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke();
  }

  g.strokeStyle = "rgba(0,0,0,.65)";
  g.lineWidth = 1.6;
  if (w.ymin < 0 && w.ymax > 0) { g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke(); }
  if (w.xmin < 0 && w.xmax > 0) { g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke(); }

  calcState.ys.forEach((src, idx) => {
    if (!src || !src.trim()) return;
    g.strokeStyle = PLOT_COLORS[idx % 3];
    g.lineWidth = 2.2;
    g.beginPath();
    let pen = false;
    for (let i = 0; i <= W; i += 1) {
      const x = w.xmin + (i / W) * (w.xmax - w.xmin);
      let y;
      try { y = evalExpr(src, { deg: calcState.deg, Ans: calcState.ans, x }); }
      catch (e) { y = NaN; }
      const span = w.ymax - w.ymin;
      if (!isFinite(y) || y < w.ymin - span * 3 || y > w.ymax + span * 3) { pen = false; continue; }
      const py = Y(y);
      if (!pen) { g.moveTo(i, py); pen = true; } else g.lineTo(i, py);
    }
    g.stroke();
  });
}
