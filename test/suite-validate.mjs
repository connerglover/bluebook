/* The loader's validation. This runs at runtime now: a bad .bbtest has to
   produce a readable message rather than a blank white page. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { validate, load } = app;
suite("validate");

const base = () => readFixture("demo-keyed.bbtest");
const v = (mutate) => { const d = base(); mutate(d); return validate.validateTest(d); };

group("a good file passes");
const good = validate.validateTest(base());
ok("ok", good.ok);
eq("no errors", good.errors.length, 0);
eq("counts questions", good.questionCount, 10);
eq("no warnings on the fixture", good.warnings.length, 0, JSON.stringify(good.warnings));

group("structural errors block loading");
ok("not an object", !validate.validateTest("nope").ok);
ok("null", !validate.validateTest(null).ok);
ok("an array is not a test", !validate.validateTest([]).ok);
ok("no sections", !v(d => { delete d.sections; }).ok);
ok("empty sections", !v(d => { d.sections = []; }).ok);
ok("questions not an array", !v(d => { d.sections[0].questions = "x"; }).ok);
ok("no questions anywhere", !v(d => { d.sections.forEach(s => { s.questions = []; }); }).ok);

group("question errors");
ok("unknown type", !v(d => { d.sections[0].questions[0].type = "telepathy"; }).ok);
ok("mcq with one choice", !v(d => { d.sections[0].questions[0].choices = ["only"]; }).ok);
ok("mcq with no choices", !v(d => { delete d.sections[0].questions[0].choices; }).ok);
ok("dropdown with no options", !v(d => { delete d.sections[1].questions[0].options; }).ok);
ok("matching missing a side", !v(d => { delete d.sections[1].questions[1].right; }).ok);
ok("fields with no fields", !v(d => { delete d.sections[1].questions[2].fields; }).ok);
ok("parts with no parts", !v(d => { delete d.sections[1].questions[3].parts; }).ok);
ok("parts nested in parts", !v(d => { d.sections[1].questions[3].parts[0].type = "parts"; }).ok);
ok("duplicate question ids", !v(d => { d.sections[0].questions[1].id = "q1"; }).ok);
ok("duplicate passage ids", !v(d => {
  d.sections[0].passages.push({ id: "p1", text: "again" });
}).ok);

group("key errors");
ok("key with no salt", !v(d => { delete d.key.salt; }).ok);
ok("key with no answers", !v(d => { delete d.key.answers; }).ok);

group("warnings let the test run");
const noTitle = v(d => { delete d.meta.title; });
ok("missing title only warns", noTitle.ok);
ok("and says so", noTitle.warnings.some(w => /title/.test(w)));

const badReveal = v(d => { d.meta.scoreReveal = "loud"; });
ok("a bad scoreReveal only warns", badReveal.ok);

const orphanKey = v(d => { d.key.answers.q99 = "abc"; });
ok("a key naming a missing question only warns", orphanKey.ok);
ok("and names the count", orphanKey.warnings.some(w => /q99/.test(w)));

const fillNoBlanks = v(d => { d.sections[1].questions[4].prompt = "No blanks here."; });
ok("a fill with no ___ only warns", fillNoBlanks.ok);

const unknownPassage = v(d => { d.sections[0].questions[2].passage = "nope"; });
ok("a question naming a missing passage only warns", unknownPassage.ok);

group("the single-backslash LaTeX trap is caught by name");
// "$\frac{1}{2}$" written with ONE backslash parses as formfeed + "rac{1}{2}".
const trapped = v(d => { d.sections[0].questions[0].prompt = "$\u000crac{1}{2}$"; });
ok("still loads", trapped.ok);
ok("but warns about the backslash", trapped.warnings.some(w => /backslash/.test(w)));

group("unbalanced math delimiters warn");
const unbal = v(d => { d.sections[0].questions[0].prompt = "What is $x + 1?"; });
ok("still loads", unbal.ok);
ok("warns about the delimiters", unbal.warnings.some(w => /delimiter/.test(w)));
const balanced = v(d => { d.sections[0].questions[0].prompt = "What is $x + 1$?"; });
ok("balanced math does not warn", !balanced.warnings.some(w => /delimiter/.test(w)));

group("parseTest turns errors into a LoadError with detail");
let err = null;
try { load.parseTest("{ not json", "x.bbtest"); } catch (e) { err = e; }
ok("throws on bad json", !!err);
eq("named", err.name, "LoadError");
ok("mentions json", /JSON/.test(err.message));
ok("points at a line", /line \d+/.test(err.message), err.message);

err = null;
try { load.parseTest(JSON.stringify({ sections: [] }), "x.bbtest"); } catch (e) { err = e; }
ok("throws on a structurally invalid test", !!err);
ok("carries the detail", !!err.detail);

group("parseTest accepts a good file");
const okParse = load.parseTest(JSON.stringify(base()), "demo.bbtest");
eq("returns the data", okParse.data.meta.title, "Feature Demo Test");
eq("and the file name", okParse.fileName, "demo.bbtest");
ok("and the report", okParse.report.ok);

done(app);
