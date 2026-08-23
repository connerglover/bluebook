/* Narrow-window behaviour. One breakpoint, max-width:860px, shared between the
   CSS and isNarrow().

   jsdom has no layout engine, so this suite checks the DECISIONS the breakpoint
   drives — which tools collapse, which classes and attributes get set — and
   never that anything is positioned correctly. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot({ narrow: true });
const { state, doc, screens, question } = app;
const S = state.state;
suite("narrow");

app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();

group("the breakpoint is detected");
ok("isNarrow true", state.isNarrow());
ok("body carries the narrow class", doc.body.classList.contains("narrow"));

group("tools collapse into one menu");
const tools = doc.querySelectorAll("#tools .tool");
eq("a single button", tools.length, 1);
eq("labelled Tools", tools[0].textContent.replace(/\s+/g, ""), "Tools");
eq("and it is the More menu", tools[0].id, "tMore");
ok("no separate highlights button", !doc.getElementById("tHl"));
ok("no separate reference button", !doc.getElementById("tRef"));

group("the collapsed menu still offers everything");
app.toolbar.toggleMore();
const menu = doc.querySelector(".moremenu");
ok("menu opened", !!menu);
const labels = Array.from(menu.querySelectorAll("button")).map(b => b.textContent.trim());
ok("highlights moved into it", labels.some(l => /Highlights/.test(l)));
ok("reference moved into it", labels.some(l => /Reference/.test(l)));
ok("line reader present", labels.some(l => /Line Reader/.test(l)));
ok("break present", labels.some(l => /Break/.test(l)));
ok("restart present", labels.some(l => /Restart/.test(l)));
ok("shortcuts present", labels.some(l => /Shortcuts/.test(l)));
app.toolbar.closeMore();
ok("menu closed", !doc.querySelector(".moremenu"));

group("no calculator in the menu for a no-calculator section");
app.toolbar.toggleMore();
ok("calculator absent in section I",
   !Array.from(doc.querySelectorAll(".moremenu button")).some(b => /Calculator/.test(b.textContent)));
app.toolbar.closeMore();
S.i = 5; screens.go("question");
app.toolbar.toggleMore();
ok("calculator present in section II",
   Array.from(doc.querySelectorAll(".moremenu button")).some(b => /Calculator/.test(b.textContent)));
app.toolbar.closeMore();

group("a question with a passage becomes two pages");
S.i = 0; screens.go("question");
const tabs = doc.getElementById("pageTabs");
ok("page tabs shown", tabs.hidden === false);
eq("two tabs", tabs.querySelectorAll("[data-page]").length, 2);
eq("named Passage and Question",
   Array.from(tabs.querySelectorAll("[data-page]")).map(b => b.textContent), ["Passage", "Question"]);
ok("split marked paged", doc.getElementById("split").classList.contains("paged"));
eq("showing the passage first", doc.getElementById("split").getAttribute("data-page"), "stim");

group("flipping to the question page");
tabs.querySelector('[data-page="q"]').click();
eq("state follows", S.page, "q");
eq("and the attribute", doc.getElementById("split").getAttribute("data-page"), "q");

group("the stack toggle shows both at once");
doc.getElementById("aioToggle").click();
eq("layout stacked", S.layout, "stacked");
ok("split marked stacked", doc.getElementById("split").classList.contains("stacked"));
ok("and no longer paged", !doc.getElementById("split").classList.contains("paged"));
doc.getElementById("aioToggle").click();
eq("toggles back to paged", S.layout, "paged");

group("a question with no passage has no tabs");
S.i = 2; screens.go("question");
ok("tabs hidden", doc.getElementById("pageTabs").hidden === true);
ok("no data-page attribute", !doc.getElementById("split").hasAttribute("data-page"));

group("the passage still survives navigation while paged");
S.i = 0; screens.go("question");
const node = doc.getElementById("paneLeft").querySelector(".stimulus");
S.i = 1; screens.go("question");
ok("same node on the next question of the same passage",
   doc.getElementById("paneLeft").querySelector(".stimulus") === node);

group("the navigator opens without chasing the button");
app.nav.openNav();
ok("open", doc.getElementById("navpop").hidden === false);
const popStyle = doc.getElementById("navpop").style;
ok("no horizontal offset is set in narrow mode", !popStyle.getPropertyValue("--navx"));
eq("caret centred", popStyle.getPropertyValue("--navcaret"), "50%");
app.nav.closeNav();

done(app);
