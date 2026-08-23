/* Data model: parsing a .bbtest into sections and questions, and the
   answered-state rules. Ported from the old test.js structure block. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, answers } = app;
suite("model");

app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");

group("structure");
eq("2 sections parsed", state.SECTIONS.length, 2);
eq("10 questions flattened", state.Q.length, 10);
eq("numbering is continuous", state.Q[9].number, 10);
eq("ids default in order", state.Q[0].id, "q1");
ok("section back-reference set", state.Q[5].section.name === "Section II");
eq("section first/last indices", [state.SECTIONS[0].first, state.SECTIONS[0].last], [0, 4]);
eq("section counts", state.SECTIONS.map(s => s.count), [5, 5]);
eq("truefalse gets built-in choices", state.Q[4].choices, ["True", "False"]);
eq("calculator policy read per section", state.SECTIONS.map(s => s.calculator), [false, true]);
eq("time limits read", state.SECTIONS.map(s => s.timeLimitMinutes), [12, 15]);
eq("meta merged over defaults", state.meta.title, "Feature Demo Test");
eq("scoreReveal carried", state.meta.scoreReveal, "detailed");
eq("tester name comes from sign-in, not the file", state.meta.testerName, "Conner Glover");

group("containers are mutated, never reassigned");
const qRef = state.Q;
const secRef = state.SECTIONS;
state.buildModel(readFixture("demo.bbtest"), "demo.bbtest");
ok("Q is the same array object after a reload", state.Q === qRef);
ok("SECTIONS is the same array object after a reload", state.SECTIONS === secRef);
eq("and it holds the new test", state.Q.length, 10);

group("answered-state rules");
app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");
app.begin();
const S = state.state;
const q = (n) => state.Q[n - 1];

ok("mcq unanswered at first", !answers.answered(q(1)));
S.answers.q1 = 1;
ok("mcq answered once picked", answers.answered(q(1)));

S.answers.q2 = [];
ok("multi with an empty array is NOT answered", !answers.answered(q(2)));
S.answers.q2 = [0];
ok("multi answered with one box", answers.answered(q(2)));

S.answers.q7 = { 0: 1 };
ok("partial matching is NOT answered", !answers.answered(q(7)));
S.answers.q7 = { 0: 1, 1: 2, 2: 0 };
ok("complete matching is answered", answers.answered(q(7)));

S.answers.q10 = ["differentiation", ""];
ok("partial fill is NOT answered", !answers.answered(q(10)));
S.answers.q10 = ["differentiation", "integration"];
ok("both blanks -> answered", answers.answered(q(10)));

S.answers["q8::0"] = "3";
ok("partial fields is NOT answered", !answers.answered(q(8)));
S.answers["q8::1"] = "\pi";
S.answers["q8::2"] = "\frac{\pi}{2}";
S.answers["q8::3"] = 1;
ok("every field filled -> answered", answers.answered(q(8)));

ok("touched is true with one field", answers.touched(q(8)));
eq("slots() expands fields", answers.slots(q(8)).length, 4);
eq("slots() expands parts", answers.slots(q(9)).length, 2);
eq("blankCount counts ___ markers", answers.blankCount(q(10)), 2);

group("essay emptiness is measured on text, not markup");
ok("empty markup is not answered", !answers.isFilled("essay", "<p><br></p>", {}));
ok("real text is answered", answers.isFilled("essay", "<p>because f' < 0</p>", {}));

done(app);
