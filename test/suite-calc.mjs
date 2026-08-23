/* The built-in calculator. The evaluator is pure and fully testable; the
   keypad is tested by PRESSING KEYS AND READING THE RESULT rather than by
   checking that elements exist — a previous refactor deleted the KEYS array
   and every "element exists" assertion still passed. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, evalMod, calc, screens } = app;
const S = state.state;
const ev = (src, env) => evalMod.evalExpr(src, env || {});
suite("calc");

group("arithmetic");
const near = (label, got, want) => ok(label, Math.abs(got - want) < 1e-9, got);
near("addition", ev("2+3"), 5);
near("precedence", ev("2+3*4"), 14);
near("parentheses", ev("(2+3)*4"), 20);
near("division", ev("1/2"), 0.5);
near("unary minus", ev("-5+2"), -3);
near("exponent", ev("2^10"), 1024);
near("exponent is right-associative", ev("2^3^2"), 512);
near("negation binds looser than power", ev("-3^2"), -9);
near("implicit multiplication", ev("3(4)"), 12);
near("implicit multiplication with a constant", ev("2pi"), 2 * Math.PI);
near("decimals", ev(".5+.25"), 0.75);
near("whitespace ignored", ev(" 2 + 3 "), 5);

group("functions and constants");
near("sqrt", ev("sqrt(16)"), 4);
near("the radical sign", ev("\u221a(9)"), 3);
near("abs", ev("abs(-7)"), 7);
near("ln e", ev("ln(e)"), 1);
near("log base 10", ev("log(100)"), 2);
near("exp", ev("exp(0)"), 1);
near("pi", ev("pi"), Math.PI);
near("the pi symbol", ev("\u03c0"), Math.PI);
near("sin in radians", ev("sin(0)"), 0);
near("a function without parentheses takes the next atom", ev("sin0"), 0);

group("degree mode");
near("sin 30 = 0.5", ev("sin(30)", { deg: true }), 0.5);
near("cos 60 = 0.5", ev("cos(60)", { deg: true }), 0.5);
near("asin comes back in degrees", ev("asin(0.5)", { deg: true }), 30);
near("and in radians by default", ev("asin(1)"), Math.PI / 2);

group("variables");
near("x is bound when supplied", ev("x^2+1", { x: 3 }), 10);
near("Ans", ev("Ans*2", { Ans: 21 }), 42);
ok("x is not a variable unless supplied", (() => {
  try { ev("x+1"); return false; } catch (e) { return true; }
})());

group("bad input throws rather than returning nonsense");
const throws = (src) => { try { ev(src); return false; } catch (e) { return true; } };
ok("dangling operator", throws("2+"));
ok("empty", throws(""));
ok("trailing junk", throws("2 3 +"));
ok("bare letters", throws("hello"));

group("no eval() — it must survive a strict CSP");
const source = evalMod.evalExpr.toString();
ok("no eval in the evaluator", !/\beval\s*\(/.test(source));
ok("no Function constructor", !/new Function/.test(source));

group("formatting");
eq("zero", evalMod.fmtNum(0), "0");
eq("integer", evalMod.fmtNum(42), "42");
eq("a third", evalMod.fmtNum(1 / 3), "0.333333333333");
ok("very large goes exponential", /e\+?\d+/.test(evalMod.fmtNum(1e12)));
ok("very small goes exponential", /e-\d+/.test(evalMod.fmtNum(1e-9)));

group("the keypad actually computes");
app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();
S.i = 5; screens.go("question");     // section II allows a calculator
calc.setCalc(true);
ok("panel open", doc.getElementById("calc").hidden === false);
const keys = doc.querySelectorAll("#keys button");
ok("keypad rendered", keys.length > 20, keys.length);

const press = (label) => {
  const b = Array.from(doc.querySelectorAll("#keys button")).find(x => x.textContent === label);
  if (!b) throw new Error("no key labelled " + label);
  b.click();
};
press("7"); press("×"); press("6"); press("ENTER");
const lcd = doc.getElementById("lcd").textContent;
ok("7 x 6 = 42 appears on the display", /42/.test(lcd), lcd);
eq("and Ans is updated", calc.calcState.ans, 42);

press("Ans"); press("+"); press("8"); press("ENTER");
ok("Ans carries into the next calculation", /50/.test(doc.getElementById("lcd").textContent));

group("a syntax error is reported, not thrown");
doc.getElementById("calcIn").value = "2+";
press("ENTER");
ok("SYNTAX ERROR shown", /SYNTAX ERROR/.test(doc.getElementById("lcd").textContent));
ok("the app is still alive", doc.getElementById("calc").hidden === false);

group("RAD/DEG toggles");
const degKey = () => Array.from(doc.querySelectorAll("#keys button")).find(x => /RAD|DEG/.test(x.textContent));
eq("starts in radians", degKey().textContent, "RAD");
degKey().click();
eq("switches to degrees", degKey().textContent, "DEG");
ok("and the state follows", calc.calcState.deg === true);

group("CLR");
press("CLR");
ok("history cleared", /Ready/.test(doc.getElementById("lcd").textContent));

group("graph tab");
calc.calcState.tab = "graph";
calc.drawCalc();
eq("three Y slots", doc.querySelectorAll(".yrow input").length, 3);
eq("four window bounds", doc.querySelectorAll(".gctl input").length, 4);
ok("a canvas is present", !!doc.getElementById("gcanvas"));
doc.getElementById("gStd").click();
eq("standard window resets the bounds",
   [calc.calcState.win.xmin, calc.calcState.win.xmax], [-10, 10]);
ok("plotting with no 2d context does not throw",
   (() => { try { doc.getElementById("gDraw").click(); return true; } catch (e) { return false; } })());

group("the calculator is hidden in a no-calculator section");
S.i = 0; screens.go("question");
ok("no calculator tool offered", !doc.getElementById("tCalc"));

done(app);
