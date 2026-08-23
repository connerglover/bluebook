/* The .bbresult.json file, which replaced the copy-paste text block. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, bbresult, describe, score, screens } = app;
const S = state.state;
suite("results");

app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");
app.begin();

group("describe(): answers become readable");
eq("mcq", describe.describe({}, "k", "mcq", {}), "BLANK");
S.answers.k = 2;
eq("mcq letter", describe.describe({}, "k", "mcq", {}), "C");
eq("truefalse names the choice", describe.describe({}, "tf", "truefalse", { choices: ["True", "False"] }), "BLANK");
S.answers.tf = 0;
eq("true", describe.describe({}, "tf", "truefalse", { choices: ["True", "False"] }), "A (True)");
S.answers.m = [0, 2];
eq("multi", describe.describe({}, "m", "multi", {}), "A, C");
S.answers.d = 1;
eq("dropdown gives the text", describe.describe({}, "d", "dropdown", { options: ["x", "y"] }), "y");
S.answers.mt = { 0: 1, 1: 0 };
eq("matching", describe.describe({}, "mt", "matching", { left: [0, 0] }), "1->B, 2->A");
S.answers.fl = ["a", ""];
eq("fill marks the empty blank", describe.describe({}, "fl", "fill", { prompt: "___ and ___" }), "[a] [BLANK]");
S.answers.es = "<p>because <b>f'</b> is negative</p>";
eq("essay flattened to text", describe.describe({}, "es", "essay", {}), "because f' is negative");
S.answers.mth = "\\frac{1}{2}";
eq("math keeps latex", describe.describe({}, "mth", "math", {}), "\\frac{1}{2}");

group("fields print as label = value pairs");
S.answers["f::0"] = "3"; S.answers["f::1"] = "\pi";
eq("joined on one line when short",
   describe.describeFields({ fields: [{ label: "Amplitude", type: "math" }, { label: "Period", type: "math" }] }, "f"),
   "Amplitude = 3; Period = \pi");

group("building a result");
Object.assign(S.answers, {
  q1: 1, q2: [0, 1, 3], q3: 0, q4: 3, q6: 1, q7: { 0: 1, 1: 2, 2: 0 },
  q10: ["differentiation", "integration"],
});
S.marked.q4 = true;
S.issues.q3 = "Two of these look correct.";
S.hlNotes.h1 = { qn: 1, quote: "Each autumn", text: "compare with the magnetic sense" };
state.SECTIONS[0].used = 640;
S.spent = 700;
await score.scoreTest();

const r = bbresult.buildResult();
eq("format stamped", r.format, 1);
eq("kind stamped", r.kind, "bbresult");
ok("iso timestamp", /^\d{4}-\d{2}-\d{2}T/.test(r.generatedAt));
eq("tester", r.tester, "Conner Glover");
eq("test title", r.test.title, "Feature Demo Test");
eq("course", r.test.course, "Mixed Subjects");
eq("source file recorded", r.test.file, "fixture.bbtest");

eq("answered count", r.progress.answered, 7);
eq("total", r.progress.total, 10);
eq("unanswered numbers", r.progress.unanswered, [5, 8, 9]);
eq("marked numbers", r.progress.markedForReview, [4]);

eq("two sections", r.sections.length, 2);
eq("section names", r.sections.map(s => s.name), ["Section I", "Section II"]);
eq("per-section time recorded", r.sections[0].timeUsedSeconds, 640);
eq("calculator policy recorded", r.sections.map(s => s.calculator), [false, true]);
eq("questions per section", r.sections.map(s => s.questions.length), [5, 5]);

const q = (n) => r.sections.flatMap(s => s.questions).find(x => x.number === n);
eq("q1 answer", q(1).answer, "B");
eq("q2 answer", q(2).answer, "A, B, D");
eq("q5 unanswered reads BLANK", q(5).answer, "BLANK");
eq("q7 matching answer", q(7).answer, "1->B, 2->C, 3->A");
eq("q10 fill answer", q(10).answer, "[differentiation] [integration]");
ok("q9 parts answer is an array", Array.isArray(q(9).answer));
eq("with part labels", q(9).answer.map(p => p.part), ["(a)", "(b)"]);
eq("q4 marked flag", q(4).markedForReview, true);
eq("q3 issue carried", q(3).issue, "Two of these look correct.");
eq("q1 has no issue", q(1).issue, null);

group("auto score is embedded");
eq("scored", r.autoScore.scored, 7);
eq("correct", r.autoScore.correct, 5);
eq("percent", r.autoScore.percent, 71.4);
ok("per-question detail included", r.autoScore.perQuestion.length === 7);

group("disputed questions are called out for re-checking");
eq("one disputed", r.disputed.length, 1);
eq("with its number", r.disputed[0].number, 3);
eq("and the note", r.disputed[0].note, "Two of these look correct.");

group("margin notes");
eq("one note", r.marginNotes.length, 1);
eq("quote kept", r.marginNotes[0].quote, "Each autumn");

group("timing");
eq("seconds", r.timing.totalSecondsUsed, 700);
eq("display", r.timing.totalDisplay, "11:40");
ok("start time recorded", !!r.timing.startedAt);

group("no key means no autoScore section rather than a fake zero");
app.start(readFixture("demo.bbtest"), "Conner Glover");
app.begin();
ok("autoScore is null", bbresult.buildResult().autoScore === null);

group("file name");
const name = bbresult.resultFileName();
ok("slugged from title and tester", /^feature-demo-test-conner-glover-\d{4}-\d{2}-\d{2}\.bbresult\.json$/.test(name), name);
ok("ends in .json so chat uploads accept it", name.endsWith(".json"));

group("it is valid JSON, round-trips, and carries no answer key");
app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");
app.begin();
S.answers.q1 = 1;
await score.scoreTest();
const text = JSON.stringify(bbresult.buildResult(), null, 2);
const back = JSON.parse(text);
eq("round-trips", back.test.title, "Feature Demo Test");
ok("the salt is not in the results file", !/\"salt\"/.test(text));
ok("no hashes leak into it", !/[0-9a-f]{64}/.test(text));

done(app);
