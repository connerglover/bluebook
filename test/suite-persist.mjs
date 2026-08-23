/* Autosave and resume. The reason this exists: a hosted page can be closed,
   refreshed, or killed by a flat battery, and the old runtime lost everything. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, store, screens, clock } = app;
const S = state.state;
suite("persist");

group("the tester's name outlives the test");
ok("nothing saved at first", store.savedName() === "");
store.saveName("  Conner Glover  ");
eq("trimmed and kept", store.savedName(), "Conner Glover");
store.saveName("");
eq("an empty name does not wipe the stored one", store.savedName(), "Conner Glover");

group("nothing is saved before the test starts");
app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");
ok("save() refuses on the intro screen", store.save() === false);
ok("and nothing is in the slot", store.load() === null);

group("a started test saves");
app.begin();
S.answers.q1 = 1;
S.answers.q2 = [0, 1, 3];
S.marked.q1 = true;
S.issues.q3 = "Two of these look right.";
S.hl["passage:p1"] = { stim: "<mark class='hl hl-yellow' data-hid='h1'>Each autumn</mark>" };
S.hlNotes.h1 = { qn: 1, quote: "Each autumn", text: "compare to the magnetic sense" };
state.SECTIONS[0].left = 640;
state.SECTIONS[0].used = 80;
S.i = 2;
ok("save() succeeds", store.save() === true);

const snap = store.load();
ok("a snapshot comes back", !!snap);
eq("format stamped", snap.format, 1);
eq("title recorded", snap.title, "Feature Demo Test");
eq("tester recorded", snap.testerName, "Conner Glover");
ok("the whole test travels with it — resume must not need the file again",
   !!snap.test && snap.test.sections.length === 2);
eq("answers saved", snap.progress.answers.q1, 1);
eq("marks saved", snap.progress.marked.q1, true);
eq("issue notes saved", snap.progress.issues.q3, "Two of these look right.");
ok("highlights saved", !!snap.progress.hl["passage:p1"]);
ok("margin notes saved", !!snap.progress.hlNotes.h1);
eq("position saved", snap.progress.i, 2);
eq("clocks saved as seconds LEFT, not as a deadline", snap.clocks[0].left, 640);
eq("time used saved", snap.clocks[0].used, 80);

group("describeSnapshot, for the resume button");
const desc = store.describeSnapshot(snap);
ok("names the test", /Feature Demo Test/.test(desc));
ok("counts answers", /2 answered/.test(desc));
ok("says when", /just now|min ago/.test(desc));

group("restoring onto a fresh model");
app.start(readFixture("demo-keyed.bbtest"), "Someone Else");
eq("fresh state has no answers", Object.keys(S.answers).length, 0);
// A tick may already have fired between start() and here, so this is
// "essentially full" rather than exactly 720.
ok("fresh clocks are full", state.SECTIONS[0].left > 719, state.SECTIONS[0].left);
store.restore(snap);
clock.initClocks();
eq("answers restored", S.answers.q1, 1);
eq("multi restored intact", S.answers.q2, [0, 1, 3]);
eq("marks restored", S.marked.q1, true);
eq("issues restored", S.issues.q3, "Two of these look right.");
ok("highlights restored", !!S.hl["passage:p1"]);
eq("position restored", S.i, 2);
eq("clock restored to what was left", state.SECTIONS[0].left, 640);
eq("the other section is untouched", state.SECTIONS[1].left, 900);
ok("no stale score carried over", S.score === null);

group("a finished test resumes to review, not to the finish screen");
const finished = JSON.parse(JSON.stringify(snap));
finished.progress.screen = "done";
store.restore(finished);
eq("done becomes review", S.screen, "review");

group("a saved position past the end of a shorter test is clamped");
const shorter = JSON.parse(JSON.stringify(snap));
shorter.progress.i = 99;
shorter.test.sections[1].questions = [];
store.restore(shorter);
ok("clamped inside the test", S.i < 99 && S.i >= 0);

group("corrupt and foreign slots are ignored, not thrown on");
app.window.localStorage.setItem("bluebook:progress:v1", "{not json");
ok("corrupt slot reads as empty", store.load() === null);
app.window.localStorage.setItem("bluebook:progress:v1", JSON.stringify({ format: 99, test: {} }));
ok("a future format is ignored", store.load() === null);

group("clear");
app.start(readFixture("demo-keyed.bbtest"), "Conner Glover");
app.begin();
S.answers.q1 = 0;
store.save();
ok("saved", !!store.load());
store.clear();
ok("cleared", store.load() === null);

group("only one test is held at a time");
app.begin();
S.answers.q1 = 0;
store.save();
const first = store.load().title;
const other = readFixture("demo.bbtest");
other.meta.title = "A Different Test";
app.start(other, "Conner Glover");
app.begin();
S.answers.q1 = 1;
store.save();
const second = store.load();
ok("the slot now holds the new test", second.title === "A Different Test");
ok("and not the old one", second.title !== first || first === "A Different Test");

group("storage failures must never take the exam down");
Object.defineProperty(app.window, "localStorage", {
  configurable: true,
  value: { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } },
});
ok("save survives a throwing localStorage", store.save() === false);
ok("load survives it too", store.load() === null);
ok("clear survives it too", (store.clear(), true));
ok("savedName survives it too", store.savedName() === "");

done(app);
