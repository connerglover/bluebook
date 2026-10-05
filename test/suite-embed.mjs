/* Embed mode: a host frames the app, supplies the test by URL and takes the
   result back by POST. The link is attacker-shapeable, so the origin checks
   matter as much as the happy path. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const PAGE = "https://practice.test/practice/app/?embed=1&src=/api/t/test&submit=/api/t/submit" +
  "&attempt=a-1&name=Conner%20Glover&theme=/practice/theme.css&tab=e";

const app = await boot({ url: PAGE });
const embed = await import(new URL("../src/embed/embed.js", import.meta.url).href);
const { store, localStore } = app;
suite("embed");

group("reading the link");
ok("embedded", embed.isEmbedded());
eq("test url resolved against the page", embed.EMBED.src, "https://practice.test/api/t/test");
eq("submit url resolved", embed.EMBED.submit, "https://practice.test/api/t/submit");
eq("attempt kept", embed.EMBED.attempt, "a-1");
eq("name kept", embed.EMBED.name, "Conner Glover");
eq("tab kept", embed.EMBED.tab, "e");

group("anything off-origin is refused");
const evil = embed.readEmbed("https://practice.test/?embed=1&src=https://evil.test/t&submit=/s&attempt=a");
ok("an off-origin test url breaks the link", evil.broken === true);
const evil2 = embed.readEmbed("https://practice.test/?embed=1&src=/t&submit=//evil.test/s&attempt=a");
ok("a protocol-relative submit url breaks the link", evil2.broken === true);
const evil3 = embed.readEmbed("https://practice.test/?embed=1&src=/t&submit=/s&attempt=a&theme=https://evil.test/x.css");
ok("an off-origin theme is dropped, not loaded", evil3.broken === false && evil3.theme === null);
const bad = embed.readEmbed("https://practice.test/?embed=1&src=/t&submit=/s&attempt=../../x");
ok("an attempt id with path characters breaks the link", bad.broken === true);
eq("no embed flag means standalone", embed.readEmbed("https://practice.test/?src=/t"), null);
const badTab = embed.readEmbed("https://practice.test/?embed=1&src=/t&submit=/s&attempt=a&tab=zz");
eq("an unknown tab is ignored", badTab.tab, null);

group("saved progress is keyed by attempt");
app.start(readFixture("demo.bbtest"), "Conner Glover");
app.begin();
app.state.state.answers.q1 = 1;
ok("save succeeds", store.save() === true);
ok("written under the attempt's slot", localStore.has("bluebook:embed:a-1"));
ok("the standalone slot is untouched", !localStore.has("bluebook:progress:v1"));
ok("and it loads back", !!store.load());

group("submitting");
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return { ok: true, status: 200, json: async () => ({ visibleScore: { correct: 3, scored: 4, percent: 75, blank: 0 } }) };
};
const reply = await embed.submitResult({ attempt: "a-1", result: { kind: "bbresult" }, answers: { q1: "B" } });
eq("posted once", calls.length, 1);
eq("to the submit url", calls[0].url, "https://practice.test/api/t/submit");
eq("as a POST", calls[0].init.method, "POST");
eq("the host's reply comes back", reply.visibleScore.percent, 75);
eq("nothing left pending", embed.pendingResult(), null);

group("a refused result stays in the browser");
calls.length = 0;
globalThis.fetch = async (url, init) => {
  calls.push({ url, init });
  return { ok: false, status: 400, json: async () => ({ error: "That result is for a different test." }) };
};
let err = null;
try { await embed.submitResult({ attempt: "a-1", result: {}, answers: {} }); } catch (e) { err = e; }
ok("it throws", !!err);
eq("with the host's sentence", err && err.message, "That result is for a different test.");
eq("a 4xx is not retried", calls.length, 1);
ok("and the body is kept for a later visit", !!embed.pendingResult());

done();
