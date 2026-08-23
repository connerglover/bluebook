/* Screen routing, section crossing, the navigator and the review page.
   Ported from test.js and gridcheck.js. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, nav, screens } = app;
const S = state.state;
suite("navigation");

app.start(readFixture("demo-keyed.bbtest"), "Tester");

group("intro");
eq("starts on the intro screen", S.screen, "intro");
ok("bottom bar hidden before starting", doc.getElementById("bottombar").hidden === true);
ok("directions button disabled on intro", doc.getElementById("dirBtn").disabled === true);
ok("title shown", /Feature Demo Test/.test(doc.querySelector(".previewwrap h1").textContent));
ok("timer opt-out offered when the test is timed", !!doc.getElementById("useTimer"));
ok("intro says MC will be checked, because this file has a key",
   /checked here/i.test(doc.querySelector(".prevcard").textContent));

group("starting");
doc.getElementById("startBtn").click();
eq("moved to question screen", S.screen, "question");
ok("bottom bar visible", doc.getElementById("bottombar").hidden === false);
ok("no-calc banner up in Section I", doc.getElementById("nocalcBanner").hidden === false);
ok("preview banner suppressed while no-calc banner shows",
   doc.getElementById("previewBanner").hidden === true);
ok("no calculator tool in a no-calculator section", !doc.getElementById("tCalc"));
ok("reference tool present because meta.reference is set", !!doc.getElementById("tRef"));
ok("back disabled on the first question", doc.getElementById("backBtn").disabled === true);
eq("next reads Next", doc.getElementById("nextBtn").textContent, "Next");

group("moving between questions");
doc.getElementById("nextBtn").click();
eq("advanced", S.i, 1);
doc.getElementById("backBtn").click();
eq("went back", S.i, 0);

group("section crossing");
S.i = 4; screens.go("question");
doc.getElementById("nextBtn").click();
eq("interstitial screen shown", S.screen, "between");
ok("names the next section", /Section II/.test(doc.querySelector(".finish").textContent));
doc.getElementById("goOn").click();
eq("into section 2", S.screen, "question");
eq("on question 6", S.i, 5);
ok("calculator tool appears", !!doc.getElementById("tCalc"));
ok("no-calc banner cleared", doc.getElementById("nocalcBanner").hidden === true);
ok("preview banner returns", doc.getElementById("previewBanner").hidden === false);

group("navigator");
nav.openNav();
ok("navigator open", doc.getElementById("navpop").hidden === false);
ok("backdrop shown", doc.getElementById("backdrop").hidden === false);
eq("aria-expanded set", doc.getElementById("navToggle").getAttribute("aria-expanded"), "true");
eq("one box per question", doc.querySelectorAll("#navGrid [data-goto]").length, 10);
eq("grouped by section when there is more than one",
   doc.querySelectorAll("#navGrid .navgroup").length, 2);
ok("current question pinned", !!doc.querySelector("#navGrid .qbox.here"));
S.answers.q1 = 1;
nav.paintNav();
ok("answered question marked done", doc.querySelector('#navGrid [data-goto="0"]').classList.contains("done"));
doc.querySelector('#navGrid [data-goto="2"]').click();
eq("jumped to question 3", S.i, 2);
ok("navigator closed after jumping", doc.getElementById("navpop").hidden === true);

group("last question offers review");
S.i = 9; screens.go("question");
eq("next reads Review on the last question", doc.getElementById("nextBtn").textContent, "Review");
doc.getElementById("nextBtn").click();
eq("on the review screen", S.screen, "review");

group("review page");
ok("heading", /Check Your Work/.test(doc.querySelector(".reviewhead h1").textContent));
eq("a card per section", doc.querySelectorAll(".reviewcard").length, 2);
eq("every question listed", doc.querySelectorAll(".reviewcard [data-goto]").length, 10);
ok("summary counts answered", /of 10 answered/.test(doc.querySelector(".summary").textContent));
ok("unanswered listed", /Unanswered:/.test(doc.querySelector(".summary").textContent));
ok("bottom bar hidden on review", doc.getElementById("bottombar").hidden === true);
doc.getElementById("backQ").click();
eq("back to the question", S.screen, "question");

group("lockSections closes a section behind you");
const locked = readFixture("demo-keyed.bbtest");
locked.meta.lockSections = true;
app.start(locked, "Tester");
app.begin();
S.i = 6; screens.go("question");
eq("only the current section is reachable", nav.accessibleSections().length, 1);
eq("and it is section II", nav.accessibleSections()[0].name, "Section II");

done(app);
