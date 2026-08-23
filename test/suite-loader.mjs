/* Reading a .bbtest off disk, and the sign-in screen's markup contract. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const app = await boot();
const { doc, load, window } = app;
suite("loader");

// Relative to this file, not to the working directory, so run.sh can launch
// the suites from anywhere.
const fixturePath = fileURLToPath(new URL("./fixtures/demo-keyed.bbtest", import.meta.url));
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const asFile = (text, name = "demo.bbtest") => new window.File([text], name, { type: "application/json" });

group("the sign-in screen has what it needs");
ok("name field", !!doc.getElementById("siName"));
ok("file picker button", !!doc.getElementById("siPick"));
ok("hidden file input", !!doc.getElementById("siFile"));
eq("accepting .bbtest", doc.getElementById("siFile").getAttribute("accept"), ".bbtest,.json,application/json");
ok("resume block present but hidden", doc.getElementById("siResume").hidden === true);
ok("device check button", !!doc.getElementById("siDevice"));
ok("link to the key builder", !!doc.querySelector('a[href="./author.html"]'));

group("it does not ask for a credential");
const inputs = Array.from(doc.querySelectorAll("#signin input"));
ok("no password field", !inputs.some(i => i.type === "password"));
ok("no email field", !inputs.some(i => i.type === "email"));
eq("the only text field is the name", inputs.filter(i => i.type === "text").length, 1);

group("the disclaimer is present and says the important words");
const d = doc.querySelector(".si-disclaimer").textContent;
ok("says unofficial", /[Uu]nofficial/.test(d));
ok("disclaims affiliation", /[Nn]ot affiliated/.test(d));
ok("names College Board", /College Board/.test(d));

group("reading a good file");
const result = await load.loadFromFile(asFile(fixtureText));
eq("title parsed", result.data.meta.title, "Feature Demo Test");
eq("file name kept", result.fileName, "demo.bbtest");
ok("report attached", result.report.ok);

group("a file that is not JSON");
let err = null;
try { await load.loadFromFile(asFile("this is not json at all")); } catch (e) { err = e; }
ok("rejects", !!err);
eq("as a LoadError", err.name, "LoadError");
ok("with a readable message", /not valid JSON/.test(err.message));

group("a file that is JSON but not a test");
err = null;
try { await load.loadFromFile(asFile('{"hello":"world"}')); } catch (e) { err = e; }
ok("rejects", !!err);
ok("says how many problems", /problem/.test(err.message));
ok("and lists them", /sections/.test(err.detail));

group("an oversized file is refused before it is read");
const big = { size: 20 * 1024 * 1024, name: "huge.bbtest" };
err = null;
try { await load.readFile(big); } catch (e) { err = e; }
ok("rejects", !!err);
ok("names the size limit", /8 MB/.test(err.message), err.message);
eq("MAX_BYTES is 8 MB", load.MAX_BYTES, 8 * 1024 * 1024);

group("no file at all");
err = null;
try { await load.readFile(null); } catch (e) { err = e; }
ok("rejects politely", !!err && /No file/.test(err.message));

group("drag detection");
ok("a Files drag is recognised",
   load.looksLikeTestDrag({ dataTransfer: { types: ["Files"], items: [] } }));
ok("a text drag is not",
   !load.looksLikeTestDrag({ dataTransfer: { types: ["text/plain"], items: [] } }));
ok("no dataTransfer is not", !load.looksLikeTestDrag({}));

group("warnings do not block a load");
const warnable = JSON.parse(fixtureText);
delete warnable.meta.title;
const parsed = load.parseTest(JSON.stringify(warnable), "w.bbtest");
ok("still loads", !!parsed.data);
ok("but reports the warning", parsed.report.warnings.length > 0);

done(app);
