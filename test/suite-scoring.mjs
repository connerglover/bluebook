/* Answer-key hashing and scoring. New in the hosted app. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";
import crypto from "node:crypto";

const app = await boot();
const { state, hash, score } = app;
const S = state.state;
suite("scoring");

group("canonical form: what actually gets hashed");
eq("mcq", hash.canonical("mcq", 1, {}), "B");
eq("truefalse", hash.canonical("truefalse", 0, {}), "A");
eq("dropdown", hash.canonical("dropdown", 3, {}), "D");
eq("multi is sorted", hash.canonical("multi", [2, 0], {}), "A,C");
eq("matching is ordered by left index", hash.canonical("matching", { 0: 1, 1: 2, 2: 0 }, { left: [0, 0, 0] }), "1-B,2-C,3-A");
ok("unanswered is null", hash.canonical("mcq", undefined, {}) === null);
ok("empty multi is null", hash.canonical("multi", [], {}) === null);
ok("incomplete matching is null", hash.canonical("matching", { 0: 1 }, { left: [0, 0, 0] }) === null);
ok("a free-response type is never canonical", hash.canonical("essay", "words", {}) === null);
ok("isScorable knows the five types",
   ["mcq", "truefalse", "multi", "dropdown", "matching"].every(hash.isScorable));
ok("and rejects the rest",
   ["short", "essay", "math", "fill", "parts", "fields"].every(t => !hash.isScorable(t)));

group("author plaintext parses to the same canonical form");
const pairs = [
  ["mcq", "B", "B"], ["mcq", "b", "B"], ["mcq", " b ", "B"],
  ["truefalse", "A", "A"],
  ["multi", "A,C", "A,C"], ["multi", "C, A", "A,C"], ["multi", "ac", "A,C"],
  ["dropdown", "D", "D"],
  ["matching", "1-B,2-C,3-A", "1-B,2-C,3-A"],
  ["matching", "2-C, 1-B, 3-A", "1-B,2-C,3-A"],
  ["matching", "1->B; 2->C; 3->A", "1-B,2-C,3-A"],
];
pairs.forEach(([t, plain, want]) =>
  eq(t + ' "' + plain + '"', hash.canonicalFromPlain(t, plain), want));
ok("nonsense returns null", hash.canonicalFromPlain("mcq", "banana") === null);
ok("empty returns null", hash.canonicalFromPlain("mcq", "  ") === null);
ok("two letters is not a single-choice answer", hash.canonicalFromPlain("mcq", "AB") === null);

group("the hash itself");
const salt = hash.newSalt();
eq("salt is 32 hex chars", salt.length, 32);
ok("salts differ", hash.newSalt() !== hash.newSalt());
const h = await hash.hashAnswer(salt, "q1", "B");
eq("sha-256 hex length", h.length, 64);
eq("matches node's own sha256",
   h, crypto.createHash("sha256").update(salt + ":q1:B").digest("hex"));
ok("a different salt changes it", await hash.hashAnswer(hash.newSalt(), "q1", "B") !== h);
ok("a different question id changes it", await hash.hashAnswer(salt, "q2", "B") !== h);
ok("a different answer changes it", await hash.hashAnswer(salt, "q1", "C") !== h);

group("scoring a real test");
app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();
ok("hasKey true for a keyed file", score.hasKey());
eq("reveal mode read from meta", score.revealMode(), "detailed");
// key is q1:B q2:A,B,D q3:C q4:D q5:A q6:B q7:1-B,2-C,3-A
Object.assign(S.answers, {
  q1: 1, q2: [0, 1, 3], q3: 0, q4: 3, q6: 1, q7: { 0: 1, 1: 2, 2: 0 },
});
const r = await score.scoreTest();
eq("seven questions keyed", r.scored, 7);
eq("five correct", r.correct, 5);
eq("one incorrect", r.incorrect, 1);
eq("one blank", r.blank, 1);
eq("percentage", r.percent, 71.4);
eq("q3 flagged incorrect", r.perQuestion.find(p => p.id === "q3").status, "incorrect");
eq("q5 flagged blank", r.perQuestion.find(p => p.id === "q5").status, "blank");
eq("q7 matching scored correct", r.perQuestion.find(p => p.id === "q7").status, "correct");
ok("free response never appears", !r.perQuestion.some(p => ["q8", "q9", "q10"].includes(p.id)));
ok("score cached on state", state.state.score === r);

group("reveal modes shape what the student sees");
r.reveal = "none";
ok("none hides everything", score.visibleScore(r) === null);
r.reveal = "total";
const t = score.visibleScore(r);
eq("total gives the number", t.correct, 5);
ok("total does not name the misses", t.missed === undefined);
r.reveal = "detailed";
const d = score.visibleScore(r);
eq("detailed names the misses", d.missed, [3]);
eq("detailed names the blanks", d.blankNumbers, [5]);

group("a test with no key");
app.start(readFixture("demo.bbtest"), "Tester");
app.begin();
ok("hasKey false", !score.hasKey());
ok("scoreTest returns null rather than 0/0", (await score.scoreTest()) === null);
group("reveal defaults");
const noReveal = readFixture("demo.bbtest");
delete noReveal.meta.scoreReveal;
app.start(noReveal, "Tester");
eq("defaults to none when meta says nothing", score.revealMode(), "none");
const bogus = readFixture("demo.bbtest");
bogus.meta.scoreReveal = "everything";
app.start(bogus, "Tester");
eq("an unknown value falls back to none", score.revealMode(), "none");

group("a partly-keyed test scores out of what was keyed");
const partial = readFixture("demo-keyed.bbtest");
partial.key.answers = { q1: partial.key.answers.q1, q3: partial.key.answers.q3 };
app.start(partial, "Tester");
app.begin();
state.state.answers.q1 = 1;
const p = await score.scoreTest();
eq("denominator is the keyed count, not the question count", p.scored, 2);
eq("one right", p.correct, 1);
eq("one blank", p.blank, 1);

done(app);
