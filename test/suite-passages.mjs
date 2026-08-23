/* Passage groups: one source text bound to a run of questions, which must keep
   its DOM (and therefore its scroll position and live highlight marks) as the
   student moves between those questions. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, screens, question } = app;
const S = state.state;
suite("passages");

app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();
const left = doc.getElementById("paneLeft");
const goTo = (n) => { S.i = n - 1; screens.go("question"); };

group("binding");
eq("section I declares one passage", state.SECTIONS[0].passages.length, 1);
eq("passage id", state.SECTIONS[0].passages[0].id, "p1");
ok("q1 bound to it", state.Q[0].passageRef === state.SECTIONS[0].passages[0]);
ok("q2 bound to it", state.Q[1].passageRef === state.SECTIONS[0].passages[0]);
ok("q3 is not", !state.Q[2].passageRef);
ok("section II has no passages", state.SECTIONS[1].passages.length === 0);

group("rendering");
goTo(1);
ok("left pane open", left.hidden === false);
eq("title rendered", left.querySelector(".passage-title").textContent, "On the Migration of Monarchs");
ok("body rendered as markup", left.querySelectorAll(".passage-body p").length === 3);
ok("passage is highlightable", !!left.querySelector(".hlable"));

group("the passage node survives navigation between its questions");
const node = left.querySelector(".stimulus");
goTo(2);
ok("same DOM node on q2", left.querySelector(".stimulus") === node);
ok("still open", left.hidden === false);
goTo(1);
ok("and still the same node coming back", left.querySelector(".stimulus") === node);

group("but is rebuilt when the passage changes");
goTo(3);
ok("left pane closed for a question with no passage", left.hidden === true);
goTo(1);
ok("rebuilt after leaving and returning", left.querySelector(".stimulus") !== node);

group("re-rendering the same question does not rebuild the pane");
goTo(1);
const node2 = left.querySelector(".stimulus");
question.drawQuestion();
question.drawQuestion();
ok("still the same node after repeated draws", left.querySelector(".stimulus") === node2);

group("highlights are stored against the passage, not the question");
eq("owner key for a passage question", question.leftSlotOwner(state.Q[0]), "passage:p1");
eq("both questions share the owner",
   question.leftSlotOwner(state.Q[0]), question.leftSlotOwner(state.Q[1]));
eq("a plain stimulus question owns its own", question.leftSlotOwner(state.Q[8]), "q9");

// simulate a highlight being made and saved on q1
goTo(1);
const body = left.querySelector(".hlable");
body.innerHTML = '<mark class="hl hl-yellow" data-hid="h1">Each autumn</mark>' + body.innerHTML;
app.highlight.saveHl();
ok("saved under the passage key", !!(S.hl["passage:p1"] && S.hl["passage:p1"].stim));
ok("not saved under the question id", !S.hl.q1 || !S.hl.q1.stim);
goTo(3); goTo(1);
ok("highlight restored when the passage is rebuilt",
   /hl-yellow/.test(left.querySelector(".hlable").innerHTML));

group("explicit passage field wins over the questions list");
const data = readFixture("demo-keyed.bbtest");
data.sections[0].passages.push({ id: "p2", title: "Second source", text: "Another text." });
data.sections[0].questions[2].passage = "p2";
app.start(data, "Tester");
app.begin();
eq("q3 now bound to p2", state.Q[2].passageRef.id, "p2");
S.i = 2; screens.go("question");
eq("and renders it", left.querySelector(".passage-title").textContent, "Second source");

group("a passage may also carry a figure");
const withFig = readFixture("demo-keyed.bbtest");
withFig.sections[0].passages[0].figure = {
  svg: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>",
  alt: "A circle.",
};
app.start(withFig, "Tester");
app.begin();
ok("figure rendered in the passage pane", !!left.querySelector(".qfigure svg"));

done(app);
