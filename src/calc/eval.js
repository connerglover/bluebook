/* The built-in calculator's expression evaluator.

   A recursive-descent parser rather than eval(), so it survives a strict CSP
   and cannot execute anything the test-taker types. Pure: no DOM, no state —
   which also makes it the easiest part of the app to test. */

export function fmtNum(v) {
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e10 || a < 1e-6) return v.toExponential(6).replace(/\.?0+e/, "e");
    return String(parseFloat(v.toPrecision(12)));
}

export function evalExpr(src, env) {
    env = env || {};
    const deg = !!env.deg;
    const s = String(src).replace(/\s+/g, "");
    let i = 0;
    const inA = function (x) { return deg ? x * Math.PI / 180 : x; };
    const outA = function (x) { return deg ? x * 180 / Math.PI : x; };
    const FN = {
      asin: function (x) { return outA(Math.asin(x)); },
      acos: function (x) { return outA(Math.acos(x)); },
      atan: function (x) { return outA(Math.atan(x)); },
      sin: function (x) { return Math.sin(inA(x)); },
      cos: function (x) { return Math.cos(inA(x)); },
      tan: function (x) { return Math.tan(inA(x)); },
      ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; },
      exp: Math.exp, abs: Math.abs, sqrt: Math.sqrt, "√": Math.sqrt
    };
    const NAMES = Object.keys(FN).sort(function (a, b) { return b.length - a.length; });
    const CONST = { "π": Math.PI, pi: Math.PI, e: Math.E, Ans: env.Ans || 0 };
    const hasX = Object.prototype.hasOwnProperty.call(env, "x");

    function eat(t) { if (s.startsWith(t, i)) { i += t.length; return true; } return false; }
    function startsAtom() {
      const c = s[i];
      if (c === undefined) return false;
      if (/[0-9(.π]/.test(c)) return true;
      if (hasX && c === "x") return true;
      if (s.startsWith("Ans", i) || s.startsWith("pi", i)) return true;
      for (let n = 0; n < NAMES.length; n++) if (s.startsWith(NAMES[n], i)) return true;
      return false;
    }
    function expr() {
      let v = term();
      for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; }
    }
    function term() {
      let v = unary();
      for (;;) {
        if (eat("*")) v *= unary();
        else if (eat("/")) v /= unary();
        else if (startsAtom()) v *= unary();
        else return v;
      }
    }
    function unary() {
      if (eat("-")) return -unary();
      if (eat("+")) return unary();
      return power();
    }
    function power() { const b = atom(); if (eat("^")) return Math.pow(b, unary()); return b; }
    function atom() {
      if (eat("(")) { const v = expr(); eat(")"); return v; }
      if (eat("π")) return Math.PI;
      if (s.startsWith("Ans", i)) { i += 3; return CONST.Ans; }
      if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
      for (let n = 0; n < NAMES.length; n++) {
        const nm = NAMES[n];
        if (s.startsWith(nm, i)) {
          i += nm.length;
          let arg;
          if (eat("(")) { arg = expr(); eat(")"); } else arg = unary();
          return FN[nm](arg);
        }
      }
      if (hasX && s[i] === "x") { i += 1; return env.x; }
      if (s[i] === "e" && !/[0-9]/.test(s[i + 1] || "")) { i += 1; return Math.E; }
      const m = /^(\d+(\.\d*)?|\.\d+)/.exec(s.slice(i));
      if (!m) throw new Error("unexpected " + (s[i] || "end"));
      i += m[0].length;
      return parseFloat(m[0]);
    }
    const out = expr();
    if (i !== s.length) throw new Error("trailing input");
    return out;
}
