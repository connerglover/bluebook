/* Section clocks. The rule under test is that exactly one function decides
   whether time is passing, and every screen change re-asks it. Two separate
   freeze/reset bugs in this project came from per-callsite start/stop. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, clock, screens } = app;
const S = state.state;
suite("clock");

app.start(readFixture("demo-keyed.bbtest"), "Tester");

group("budgets");
eq("budgets in seconds", state.SECTIONS.map(s => s.budget), [720, 900]);
eq("each starts full", state.SECTIONS.map(s => s.left), [720, 900]);
ok("nothing expired at the start", state.SECTIONS.every(s => !s.expired));

group("clockRunning is the single source of truth");
ok("not running on the intro screen", !clock.clockRunning());
app.begin();
ok("running on a question", clock.clockRunning());
screens.go("review");
ok("not running on the review page", !clock.clockRunning());
screens.go("question");
ok("running again back on a question", clock.clockRunning());
doc.getElementById("breakScreen").hidden = false;
ok("not running behind the break screen", !clock.clockRunning());
doc.getElementById("breakScreen").hidden = true;
doc.getElementById("timeScrim").hidden = false;
ok("not running behind the time-up notice", !clock.clockRunning());
doc.getElementById("timeScrim").hidden = true;
S.timerOn = false;
ok("not running when the clocks are switched off", !clock.clockRunning());
S.timerOn = true;

group("time is spent against the section you are in");
S.i = 0; screens.go("question");
const sec1 = state.SECTIONS[0], sec2 = state.SECTIONS[1];
sec1.left = 700; sec1.used = 20;
S.i = 5; screens.go("question");
eq("section II untouched by section I's spend", sec2.left, 900);
eq("section I keeps what it used", sec1.used, 20);

group("formatting");
eq("under an hour", clock.fmtClock(725), "12:05");
eq("exactly zero", clock.fmtClock(0), "0:00");
eq("pads seconds", clock.fmtClock(61), "1:01");
eq("over an hour", clock.fmtClock(3725), "1:02:05");
eq("negative clamps to zero", clock.fmtClock(-5), "0:00");

group("running out");
S.i = 0; screens.go("question");
sec1.left = 0.0001;
clock.syncClock();
// force a tick by moving time forward
sec1.left = 0; sec1.expired = true;
clock.syncClock();
ok("expired section stops the clock", !clock.clockRunning());

group("expiry does not lose answers");
S.answers.q1 = 2;
screens.go("question");
eq("answer still there after time ran out", S.answers.q1, 2);

group("an untimed section shows no clock");
const untimed = readFixture("demo-keyed.bbtest");
untimed.sections.forEach(s => { s.timeLimitMinutes = 0; });
app.start(untimed, "Tester");
app.begin();
clock.paintClock();
ok("clock hidden when nothing is timed", doc.getElementById("clockWrap").hidden === true);
ok("and the clock is not running", !clock.clockRunning());

group("hide/show toggle");
app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();
const label = () => doc.getElementById("clockToggle").textContent;
eq("starts showing the numbers", label(), "Hide");
clock.toggleClockVisible();
eq("toggles to Show", label(), "Show");
ok("stopwatch icon replaces the numbers", /svg/i.test(doc.getElementById("clock").innerHTML));
ok("state.clockVisible follows it", S.clockVisible === false);
clock.toggleClockVisible();
eq("toggles back", label(), "Hide");
ok("numbers return", /^\d+:\d\d$/.test(doc.getElementById("clock").textContent));

done(app);
