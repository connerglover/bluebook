/* Every question type renders real controls and records what is chosen.
   Ported from test.js and fieldtest.js. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc } = app;
const S = state.state;
suite("questions");

app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();

const goTo = (n) => { S.i = n - 1; app.screens.go("question"); };
const pick = (i) => doc.querySelector('[data-pick="' + i + '"]').click();

group("q1 mcq");
eq("five choices rendered", doc.querySelectorAll("[data-pick]").length, 5);
eq("letters A-E", Array.from(doc.querySelectorAll(".letter")).map(n => n.textContent).join(""), "ABCDE");
pick(2);
eq("answer stored as an index", S.answers.q1, 2);
pick(2);
ok("re-click deselects", S.answers.q1 === undefined);
pick(1);
doc.querySelector('[data-strike="3"]').click();
ok("cross-out recorded", S.struck.q1 && S.struck.q1[3] === true);
eq("selection survived crossing out a different choice", S.answers.q1, 1);
doc.querySelector('[data-strike="1"]').click();
ok("crossing out the SELECTED choice clears it", S.answers.q1 === undefined);
doc.getElementById("markBtn").click();
ok("mark for review", S.marked.q1 === true);
ok("ABC eliminator button present on mcq", !!doc.getElementById("elimBtn"));

group("q2 multi");
goTo(2);
pick(0); pick(3);
eq("two boxes checked, sorted", S.answers.q2, [0, 3]);
pick(0);
eq("uncheck works", S.answers.q2, [3]);
ok("select-all hint shown", /SELECT ALL THAT APPLY/.test(doc.querySelector(".field-label")?.textContent || ""));

group("q5 truefalse");
goTo(5);
eq("two choices auto-built", doc.querySelectorAll("[data-pick]").length, 2);
eq("labelled True/False", Array.from(doc.querySelectorAll(".choice .body")).map(n => n.textContent.trim()), ["True", "False"]);
pick(1);
eq("false selected", S.answers.q5, 1);

group("q6 dropdown");
goTo(6);
const sel = doc.querySelector("select.sel");
ok("a select is rendered", !!sel);
eq("placeholder plus five options", sel.options.length, 6);
sel.value = "1"; sel.dispatchEvent(new app.window.Event("change"));
eq("dropdown records an index", S.answers.q6, 1);

group("q7 matching");
goTo(7);
const rows = doc.querySelectorAll(".matchrow");
eq("one row per left item", rows.length, 3);
const sels = doc.querySelectorAll(".matchrow select");
sels[0].value = "1"; sels[0].dispatchEvent(new app.window.Event("change"));
sels[1].value = "2"; sels[1].dispatchEvent(new app.window.Event("change"));
sels[2].value = "0"; sels[2].dispatchEvent(new app.window.Event("change"));
eq("matching records a map", S.answers.q7, { 0: 1, 1: 2, 2: 0 });

group("q8 fields");
goTo(8);
const fieldRows = doc.querySelectorAll(".fieldrow");
eq("four labelled field rows", fieldRows.length, 4);
eq("labels rendered", Array.from(doc.querySelectorAll(".flabel")).map(n => n.textContent),
   ["Amplitude", "Period", "Phase shift", "Direction"]);
eq("one autosave note for the whole group, not one per field",
   doc.querySelectorAll(".autosave").length, 1);
ok("a dropdown field renders a select", !!doc.querySelector(".fieldrow select"));

group("q9 parts");
goTo(9);
eq("two part blocks", doc.querySelectorAll(".parts > div").length, 2);
eq("labelled (a) and (b)", Array.from(doc.querySelectorAll(".partlabel")).map(n => n.textContent),
   ["Part A", "Part B"]);
ok("essay editor rendered for part a", !!doc.querySelector(".editor"));
ok("stimulus pane open", doc.getElementById("paneLeft").hidden === false);
ok("data table rendered", doc.querySelectorAll(".datatable td").length > 0);

group("q10 fill");
goTo(10);
const blanks = doc.querySelectorAll(".blank");
eq("two blanks from ___ markers", blanks.length, 2);
blanks[0].value = "differentiation";
blanks[0].dispatchEvent(new app.window.Event("input", { bubbles: true }));
eq("blank recorded positionally", S.answers.q10[0], "differentiation");
ok("prompt text kept around the blanks", /Fundamental Theorem/.test(doc.querySelector(".fillline").textContent));

group("essay records markup");
goTo(9);
const ed = doc.querySelector(".editor");
ed.innerHTML = "<p>because <b>f'</b> is negative</p>";
ed.dispatchEvent(new app.window.Event("input", { bubbles: true }));
ok("essay stores html", /f'/.test(S.answers["q9::0"]));

group("issue notes");
goTo(1);
doc.getElementById("issueBtn").click();
const field = doc.getElementById("issueField");
field.value = "Two of these look right.";
field.dispatchEvent(new app.window.Event("input", { bubbles: true }));
eq("issue text recorded", S.issues.q1, "Two of these look right.");
ok("counter updates", /500/.test(doc.getElementById("issueCount").textContent));
doc.getElementById("issueClear").click();
ok("clearing removes the note", S.issues.q1 === undefined);

done(app);
