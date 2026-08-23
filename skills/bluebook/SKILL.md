---
name: bluebook
description: >-
  Write practice tests as .bbtest files for the Bluebook-style exam app, and
  grade the .bbresult.json files it produces. Use this whenever someone wants a
  practice test, mock exam, quiz, midterm, final, or self-assessment they can
  actually sit — including "quiz me on chapter 7", "make me a practice AP exam",
  "build a test over this unit", or "I need something to study with" — in any
  subject, not just maths. Also use it whenever someone attaches or pastes a
  .bbresult.json or a results file, says they finished or submitted a practice
  test, or asks to have a test graded, scored, marked, or reviewed. Covers the
  hashed answer key, figures, reading passages, and multi-part free response.
---

# Bluebook practice tests

This skill covers both ends of one workflow:

- **Authoring** — turn a topic into a `.bbtest` file, a few KB of JSON, that
  someone opens in the exam app and sits.
- **Grading** — read the `.bbresult.json` the app saves when they finish.

The app itself is a hosted static site. It has no server, holds no plaintext
answers, and never sees anything you write here. Files move by hand: you produce
a `.bbtest`, they produce a `.bbresult.json`.

Work out which job you are doing and jump to that section. If someone hands you
a results file, they want grading even if they do not say so.

---

## Writing a test

### 1. Understand what is being tested before writing anything

A practice test is only useful if it resembles the real assessment. Ask, or work
out from what you have been given:

- How many choices per question? (AP-style packets use five, A–E)
- Is free response multi-part? Does it demand justification?
- Is a calculator allowed? On which sections?
- How long is it, and how many questions?
- Which specific topics, and which mistakes does this student actually make?

If the person has past tests, a syllabus, a textbook chapter, or a unit map,
that is the source — read it before writing. When you have no signal at all,
reasonable defaults: five choices, a mix of objective and free response, 12–15
objective and 6–8 free response for a full test, half that for a quiz.

Do not write an outline or a prose draft first. Go straight to the JSON — the
structure *is* the outline, and a prose pass gets rewritten anyway.

### 2. Write the JSON

Read `references/format.md` for the full schema. `assets/example.bbtest` is a
small working test using passages, figures, math, `fields` and `parts` — copy
its shapes rather than reconstructing them from the spec.

The two defaults that separate a test that feels real from one that feels
generated:

**Mathematical answers take a `math` input, not `short`.** A plain text box
records what the keys produced — `[-inf, 4]`, `pi/6` — which is worse to read,
worse to grade, and nothing like what someone writes on paper. Use `short` only
for a word or a name: "even", "the Mean Value Theorem".

**A prompt asking for N things takes `fields`, with N labelled inputs.** Read
each prompt and count the distinct things being asked. "State the amplitude,
period, and phase shift" is three inputs. "Find the maximum and justify your
answer" is a `math` field plus an `essay`. When someone has to cram two answers
into one box, both the answer and the grading get worse.

Assume `math` and `fields` are correct and justify the exception, rather than
the other way round.

`references/authoring.md` covers the rest — distractors that come from real
mistakes rather than filler, when to reach for `matching` or `multi`, how free
response should escalate, and figures. Read it before writing questions, not
after.

### 3. Validate — every time, before showing anyone

```bash
python scripts/validate_bbtest.py path/to/test.bbtest
```

This is not optional politeness. The failure modes it catches are mostly silent:
a single-backslash `\frac` deletes the maths with no error anywhere, an unclosed
`$` renders the rest of the question as raw LaTeX, a duplicate question id
breaks the answer key. The app refuses a file with structural errors, but by
then the student is already looking at the screen.

It reports two kinds of finding:

- **ERROR** — the app will refuse the file. Fix it.
- **warning** — the file loads, but something is probably wrong. These are
  heuristics, so use judgement; a warning about a prompt asking for three things
  with one input is almost always worth acting on.

Fix and re-run until it is clean.

### 4. Write the answer key at the same time as the test

Commit the key while the questions are fresh. Deriving answers later means
reasoning from scratch, and you can land somewhere other than where the
distractors were aimed — which is exactly how a subtly broken question survives.

Write it to its own file, `unit-4-key.md` or similar. Per question: the correct
answer, a one-line rationale, a topic tag, and for free response a rubric with
points per part. Flag anything you are not certain about — a question you cannot
defend is one to rewrite now rather than argue about later.

**Do not put the key in the chat, and do not put it in the `.bbtest`.** Hand the
key over labelled "don't open until you've submitted", and decline if asked for
it before results come back. The whole point of the format is that the test file
can be sent straight to the person taking the test.

### 5. Attach the key to the file, if they want the multiple choice checked

The app can mark every question with a fixed set of choices — `mcq`,
`truefalse`, `multi`, `dropdown`, `matching` — if the file carries a hashed key.
Free response never is; that still needs a human.

```bash
python scripts/make_key.py test.bbtest -k key.txt --reveal total -o test-keyed.bbtest
```

`key.txt` is one `id: answer` per line:

```
q1: B
q2: A,C
q7: 1-B, 2-C, 3-A
```

Run it with no answers to list which questions can be scored and what letters
each one offers. It refuses to write anything if an answer is out of range or
unparseable, because a key that silently cannot match is worse than no key.

`--reveal` decides what the student is told at the end:

| | |
|---|---|
| `none` (default) | Nothing. The score still goes into the results file. |
| `total` | The number correct out of the number keyed. |
| `detailed` | The total plus which questions were missed. |

`detailed` gives the key away by elimination on a retake. It suits a one-off
review; `total` or `none` suits a test they might sit twice.

**Say plainly what the hashing does.** It stops someone reading the key out of
the file or the devtools console. That is all. The salt ships with the file
because the browser needs it to verify, so five choices is a five-iteration
brute force. It is obfuscation, not security — if a key genuinely must stay
secret, score by hand instead.

### 6. Hand it over

Deliver the `.bbtest` (or the keyed version) and, separately, the key file. Say
in a sentence what the test covers and how long it should take. Nothing about
the answers.

---

## Grading a result

### 1. Read the file with the script

```bash
python scripts/read_result.py path/to/result.bbresult.json
```

The raw JSON is complete but verbose, and reading it directly means spending
attention on structure instead of on the work. The script prints it in the order
grading actually needs: disputed questions first, then the auto-score, then
pacing, then every answer with its flags. Add `--json` for a compact digest if
you want to reason over it in code.

`references/results.md` documents the file if you need a field the script does
not surface.

### 2. Deal with disputed questions before scoring anything

The app lets someone flag a question they think is wrong, and those flags come
back in `disputed`. Take them seriously and check each against your key first.

A challenge that turns out to be valid should **drop the question from the
denominator**, not be marked wrong. Say exactly what was wrong with the item and
treat it as a note for the next test you write. A student who spots a broken
question has done something worth more than getting it right.

A challenge that does not hold up deserves a plain explanation of why the
intended answer works. Say so directly — a wrong challenge is worth correcting,
and hedging helps nobody.

### 3. Score the rest

Objective questions go against the key. If `autoScore` is present the app has
already marked the fixed-choice ones; check its verdicts against your own
reading rather than trusting them blindly, since it only knows what the key
said, and the key might have been wrong.

Free response goes part by part against your rubric. Show what was lost and
where — "full credit for the setup, no credit for the endpoint check" tells
someone what to fix; "3/5" does not.

Report unanswered separately from wrong. They are different problems.

### 4. Read the signals the file carries beyond right and wrong

**Pacing.** The file records time used per section. Blanks bunched at the end of
a section are a timing problem, not a knowledge problem, and the advice is about
pacing rather than content. The script flags this.

**Marked for review but correct.** Someone who flagged a question and still got
it right has a confidence gap. Naming it is often more useful than anything
about the questions they missed.

**Margin notes.** Whatever they highlighted and wrote to themselves shows where
the reading was hard.

### 5. Report by topic, not by question number

"You lost marks on 3, 7, 12 and 19" is a list. "Chain rule — you are dropping
the inner derivative, which cost you 3, 7 and 19" is something to act on. Group
the misses by what caused them, and point at the specific sections or chapters
to review.

Sort each miss before choosing the advice, because these need different
responses:

- **a slip** — knew it, wrote it wrong. Name it and move on; a worked example is
  wasted here.
- **a procedural gap** — knows the concept, cannot execute the steps reliably.
- **a conceptual gap** — the underlying idea is not there.
- **a discrimination failure** — knew the material but was pulled by a
  distractor. The choice they picked usually tells you which misconception.

Then, and only then, give the full key: every question, the correct answer, and
why. This is the first point in the workflow where answers are shown.

---

## Files in this skill

| Path | What it is | When to read it |
|---|---|---|
| `references/format.md` | The `.bbtest` schema | Before writing any test |
| `references/authoring.md` | Writing questions worth sitting | Before writing questions |
| `references/results.md` | The `.bbresult.json` schema | Only if the reader script does not surface what you need |
| `assets/example.bbtest` | A small working test | Copy its shapes |
| `scripts/validate_bbtest.py` | Validator | Every test, before delivery |
| `scripts/make_key.py` | Hashed key builder | When the multiple choice should be auto-marked |
| `scripts/read_result.py` | Results reader | Every result, before grading |

The scripts need only Python 3 — no dependencies to install.

If you are working inside the bluebook repo itself, `docs/` there is the source
of truth and these reference copies may lag it. Everywhere else, these are
authoritative.
