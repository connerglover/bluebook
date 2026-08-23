/* One full sitting, start to finish: load, answer, cross a section boundary,
   review, submit, score, and produce the results file. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, screens, score, bbresult, store } = app;
const S = state.state;
suite("end to end");

group("sign in and load");
const parsed = app.load.parseTest(JSON.stringify(readFixture("demo-keyed.bbtest")), "unit-demo.bbtest");
app.start(parsed.data, "Conner Glover", "unit-demo.bbtest");
ok("exam shown", doc.getElementById("app").hidden === false);
ok("sign-in hidden", doc.getElementById("signin").hidden === true);
eq("on the intro", S.screen, "intro");

group("start");
doc.getElementById("startBtn").click();
eq("question 1", S.i, 0);
ok("started flag set", S.started);
ok("start time recorded", !!S.startedAt);

group("section I");
doc.querySelector('[data-pick="1"]').click();            // q1 -> B (correct)
eq("q1 recorded", S.answers.q1, 1);
doc.getElementById("nextBtn").click();
doc.querySelector('[data-pick="0"]').click();            // q2 -> A
doc.querySelector('[data-pick="1"]').click();            // q2 -> A,B
doc.querySelector('[data-pick="3"]').click();            // q2 -> A,B,D (correct)
eq("q2 recorded", S.answers.q2, [0, 1, 3]);
doc.getElementById("nextBtn").click();
doc.querySelector('[data-pick="2"]').click();            // q3 -> C (correct)
doc.getElementById("markBtn").click();
ok("q3 marked for review", S.marked.q3);
doc.getElementById("nextBtn").click();
doc.querySelector('[data-pick="0"]').click();            // q4 -> A (WRONG, key is D)
doc.getElementById("issueBtn").click();
const f = doc.getElementById("issueField");
f.value = "The graph description is ambiguous.";
f.dispatchEvent(new app.window.Event("input", { bubbles: true }));
ok("q4 issue noted", !!S.issues.q4);
doc.getElementById("nextBtn").click();
// q5 deliberately left blank
eq("on q5", S.i, 4);

group("crossing into section II");
doc.getElementById("nextBtn").click();
eq("interstitial", S.screen, "between");
doc.getElementById("goOn").click();
eq("into section II", S.i, 5);
ok("calculator now offered", !!doc.getElementById("tCalc"));

group("section II");
const sel = doc.querySelector("select.sel");
sel.value = "1"; sel.dispatchEvent(new app.window.Event("change"));   // q6 -> B (correct)
doc.getElementById("nextBtn").click();
const ms = doc.querySelectorAll(".matchrow select");
[[0, "1"], [1, "2"], [2, "0"]].forEach(([i, v]) => {
  ms[i].value = v; ms[i].dispatchEvent(new app.window.Event("change"));
});
eq("q7 matched", S.answers.q7, { 0: 1, 1: 2, 2: 0 });                 // correct
doc.getElementById("nextBtn").click();
// q8 fields, q9 parts, q10 fill: fill in a couple
S.answers["q8::0"] = "3";
doc.getElementById("nextBtn").click();
doc.getElementById("nextBtn").click();
const blanks = doc.querySelectorAll(".blank");
blanks[0].value = "differentiation";
blanks[0].dispatchEvent(new app.window.Event("input", { bubbles: true }));
blanks[1].value = "integration";
blanks[1].dispatchEvent(new app.window.Event("input", { bubbles: true }));

group("progress was saved along the way");
store.save();
const snap = store.load();
ok("a snapshot exists mid-test", !!snap);
eq("with the answers so far", snap.progress.answers.q1, 1);

group("review");
doc.getElementById("nextBtn").click();
eq("on review", S.screen, "review");
const summary = doc.querySelector(".summary").textContent;
ok("counts what is answered", /of 10 answered/.test(summary));
ok("lists the blanks", /Unanswered: 5/.test(summary));
ok("lists the marked", /Marked for Review: 3/.test(summary));
ok("lists the notes", /Notes left: 4/.test(summary));

group("finishing with blanks asks first");
doc.getElementById("finishBtn").click();
ok("confirmation shown", doc.getElementById("askScrim").hidden === false);
ok("names the unanswered questions", /5/.test(doc.getElementById("askBody").textContent));
doc.getElementById("askNo").click();
eq("saying no keeps you on review", S.screen, "review");
doc.getElementById("finishBtn").click();
doc.getElementById("askYes").click();
await new Promise(r => setTimeout(r, 50));
eq("saying yes finishes", S.screen, "done");

group("the finish screen");
ok("congratulations", /All Finished/.test(doc.querySelector(".finish h1").textContent));
ok("save button offered", !!doc.getElementById("saveBtn"));
ok("names the file it will save", /\.bbresult\.json/.test(doc.getElementById("fileHint").textContent));
ok("top bar hidden", doc.getElementById("topbar").hidden === true);
ok("return-to-start bar shown", doc.getElementById("minibar").hidden === false);

group("the score");
const s = await score.scoreTest();
eq("seven keyed", s.scored, 7);
eq("five correct", s.correct, 5);
eq("q4 wrong as intended", s.perQuestion.find(p => p.id === "q4").status, "incorrect");
eq("q5 blank as intended", s.perQuestion.find(p => p.id === "q5").status, "blank");

group("the results file");
const r = bbresult.buildResult();
eq("tester", r.tester, "Conner Glover");
eq("source file", r.test.file, "unit-demo.bbtest");
eq("answered", r.progress.answered, 7);
eq("score embedded", r.autoScore.correct, 5);
eq("the disputed question is called out", r.disputed.map(d => d.number), [4]);
eq("marked question recorded", r.progress.markedForReview, [3]);
ok("both sections present", r.sections.length === 2);
ok("serialises", typeof JSON.stringify(r) === "string");
ok("carries no hashes", !/[0-9a-f]{64}/.test(JSON.stringify(r)));

group("restarting clears everything");
app.toolbar.setToolbarHooks({ onRestart: () => store.clear() });
S.screen = "question";
app.toolbar.restartExam();
doc.getElementById("askYes").click();
await new Promise(r2 => setTimeout(r2, 20));
eq("back on the intro", S.screen, "intro");
eq("answers cleared", Object.keys(S.answers).length, 0);
eq("marks cleared", Object.keys(S.marked).length, 0);
eq("issues cleared", Object.keys(S.issues).length, 0);
eq("clocks reset", state.SECTIONS.map(x => x.left), [720, 900]);
ok("saved progress cleared", store.load() === null);

done(app);
