/* Highlights and the notes column. Ported from hlcheck.js.
   NOTE: this suite cannot see geometry. jsdom returns zeros from
   getBoundingClientRect, so where the toolbar lands is untested here. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, highlight, screens } = app;
const S = state.state;
suite("highlight");

app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();

group("the toolbar markup is complete");
const bar = doc.getElementById("hlToolbar");
eq("six controls", bar.querySelectorAll("[data-hl]").length, 6);
eq("three colours, underline, clear, note",
   Array.from(bar.querySelectorAll("[data-hl]")).map(b => b.getAttribute("data-hl")),
   ["yellow", "blue", "pink", "under", "clear", "note"]);
ok("starts hidden", bar.hidden === true);
ok("every control is labelled for screen readers",
   Array.from(bar.querySelectorAll("[data-hl]")).every(b => b.getAttribute("aria-label")));

group("highlightable regions are marked up");
const left = doc.getElementById("paneLeft");
ok("passage is highlightable", !!left.querySelector('.hlable[data-hlslot="stim"]'));
ok("question stem is highlightable", !!doc.querySelector('#solo .hlable[data-hlslot="stem"]'));

group("saving marks");
const stem = doc.querySelector('#solo .hlable[data-hlslot="stem"]');
stem.innerHTML = '<mark class="hl hl-blue" data-hid="h9">antennae</mark> rest of it';
highlight.saveHl();
ok("stem markup saved under the question id", !!(S.hl.q1 && S.hl.q1.stem));
ok("and it contains the mark", /hl-blue/.test(S.hl.q1.stem));

group("marks are restored when the question is redrawn");
S.i = 1; screens.go("question");
S.i = 0; screens.go("question");
ok("stem highlight came back",
   /hl-blue/.test(doc.querySelector('#solo .hlable[data-hlslot="stem"]').innerHTML));

group("the notes column");
highlight.openNotes(true);
ok("pane open", doc.getElementById("notesPane").hidden === false);
const cards = doc.querySelectorAll("#notesList .ncard");
eq("a card per mark on screen", cards.length, 1);
ok("the quote is in the card header", /antennae/.test(doc.querySelector(".nc-quote").textContent));
ok("card carries a textarea", !!doc.querySelector("#notesList textarea"));
ok("and a delete button", !!doc.querySelector("#notesList [data-del]"));

group("typing a note");
const ta = doc.querySelector('#notesList [data-note="h9"]');
ta.value = "check this against the sun compass paragraph";
ta.dispatchEvent(new app.window.Event("input", { bubbles: true }));
ok("note recorded", !!S.hlNotes.h9);
eq("with its text", S.hlNotes.h9.text, "check this against the sun compass paragraph");
eq("and the question number", S.hlNotes.h9.qn, 1);
ok("the mark is flagged as annotated",
   doc.querySelector('mark.hl[data-hid="h9"]').classList.contains("hasnote"));

group("emptying a note removes it");
ta.value = "   ";
ta.dispatchEvent(new app.window.Event("input", { bubbles: true }));
ok("note dropped", S.hlNotes.h9 === undefined);
ok("and the flag cleared",
   !doc.querySelector('mark.hl[data-hid="h9"]').classList.contains("hasnote"));

group("deleting a highlight");
ta.value = "keep me";
ta.dispatchEvent(new app.window.Event("input", { bubbles: true }));
doc.querySelector('#notesList [data-del="h9"]').click();
ok("delete confirmation shown", doc.getElementById("delPop").hidden === false);
doc.getElementById("delNo").click();
ok("saying no keeps it", doc.getElementById("delPop").hidden === true && !!S.hlNotes.h9);
doc.querySelector('#notesList [data-del="h9"]').click();
doc.getElementById("delYes").click();
ok("saying yes unwraps the mark", !doc.querySelector('mark.hl[data-hid="h9"]'));
ok("and drops its note", S.hlNotes.h9 === undefined);
ok("but keeps the underlying text",
   /antennae/.test(doc.querySelector('#solo .hlable[data-hlslot="stem"]').textContent));

group("notes pane closes with the question screen");
highlight.openNotes(true);
screens.go("review");
ok("hidden on review", doc.getElementById("notesPane").hidden === true);
ok("toolbar hidden too", doc.getElementById("hlToolbar").hidden === true);

group("empty state");
screens.go("question");
S.i = 2; screens.go("question");
highlight.openNotes(true);
ok("prompts you to select text when there is nothing marked",
   /Select any passage/.test(doc.getElementById("notesList").textContent));

done(app);
