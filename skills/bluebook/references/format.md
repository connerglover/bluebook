# The `.bbtest` format

A test file is one JSON object saved with a `.bbtest` extension. The person
sitting the test opens it from the app's sign-in screen; the runtime itself
never changes.

This document is the contract. The app validates against it on load
(`src/loader/validate.js`) and refuses a file that breaks the rules, so a
mistake here shows up as a readable message rather than a blank page.

## Shape

```json
{
  "meta": {
    "course": "AP Calculus BC",
    "title": "Unit 4 Test",
    "previewBanner": "THIS IS A PRACTICE TEST",
    "scoreReveal": "none",
    "reference": "<h3>Formulas</h3><p>$\\frac{d}{dx}\\sin x = \\cos x$</p>",
    "gradingNote": ""
  },
  "sections": [
    {
      "name": "Section I, Part A",
      "label": "No Calculator Allowed",
      "calculator": false,
      "timeLimitMinutes": 30,
      "directions": "<p>Solve each problem and select the best choice.</p>",
      "passages": [],
      "questions": []
    }
  ],
  "key": null
}
```

Only `meta.title`, `sections[].name`, and `sections[].questions` are required.
Everything else has a sensible default, though `calculator` defaults to **false**
— set it explicitly.

Sections are the organizing unit. Each carries its own clock, its own calculator
policy, its own directions. Crossing a section boundary shows an interstitial and
starts that section's clock. Questions are numbered continuously across the whole
test; the review page groups by section.

The tester's name is **not** in the file. It is asked for on the sign-in screen
and remembered in the browser.

### `meta.scoreReveal`

How much the app says about the auto-score when the test is submitted. Only
meaningful when the file also carries a `key`.

| Value | The student sees |
|---|---|
| `"none"` (default) | Nothing. The score still goes into the results file. |
| `"total"` | The number correct out of the number keyed. Not which ones. |
| `"detailed"` | The total, plus the numbers missed and left blank. |

`"detailed"` lets a student learn the key by elimination on a retake. Use it for
a one-off review, not for a test you plan to reuse.

## Question types

| `type` | Fields | Recorded as | Auto-scorable |
|---|---|---|---|
| `mcq` | `choices[]` | one letter | yes |
| `multi` | `choices[]` | several letters, select all that apply | yes |
| `truefalse` | none — choices are built in | A (True) / B (False) | yes |
| `dropdown` | `options[]` | the chosen text | yes |
| `matching` | `left[]`, `right[]` | `1->A, 2->B` | yes |
| `fill` | `___` in the prompt, optional `blankHints[]` | `[answer] [answer]` | no |
| `short` | none | one line of text | no |
| `essay` | none | rich text, flattened to plain text on output | no |
| `math` | optional `mathHint` | LaTeX from the math field | no |
| `parts` | `parts[]`, each with its own `type` | labeled `(a)`, `(b)`, `(c)` | no |
| `fields` | `fields[]`, each `{label, type, …}` | `Label = value; Label = value` | no |

`parts` cannot nest inside `parts`, and neither `parts` nor `fields` can nest
inside `fields`. Every other type is legal as a part or a field.

### Defaults worth internalizing

Reach for `math` for anything mathematical and `fields` for any prompt asking for
more than one thing. Most weak generated tests are weak because they defaulted to
`short` and crammed several answers into one box.

**Five choices, A–E** is the house style for AP-style packets. `Does not exist`
and `It cannot be determined` are legitimate, often-correct options.

### `fields` — several answers under one prompt

One input holds one answer. When a prompt asks for more than one thing, `fields`
gives each its own labelled box.

```json
{ "id": "q19", "type": "fields",
  "prompt": "State the amplitude, period, and phase shift of the function.",
  "fields": [
    { "label": "Amplitude", "type": "math" },
    { "label": "Period", "type": "math" },
    { "label": "Phase shift", "type": "math" },
    { "label": "Direction", "type": "dropdown", "options": ["to the left", "to the right"] }
  ] }
```

Every field needs a `label` — without one the test-taker cannot tell the boxes
apart. The whole group counts as answered only when every field is filled.

### `parts` — a multi-part free response

```json
{ "id": "q9", "type": "parts",
  "stimulus": {
    "text": "Values of $f'$ at selected values of $x$ are given.",
    "table": { "head": ["$x$", "0", "2", "4"], "rows": [["$f'(x)$", "3", "1", "-2"]] }
  },
  "prompt": "",
  "parts": [
    { "type": "essay", "prompt": "On what intervals is $f$ decreasing? Justify your answer." },
    { "type": "math",  "prompt": "Find the absolute minimum of $f$ on $[0,4]$." }
  ] }
```

## Stimulus

Optional, per question. Renders in a resizable left pane beside the question.

```json
"stimulus": {
  "text": "A paragraph. Blank lines become paragraph breaks.",
  "table": { "head": ["$x$", "0", "1"], "rows": [["$f(x)$", "2", "5"]] },
  "figure": { "svg": "…", "alt": "…" },
  "caption": "Graph of $f'$"
}
```

## Passages — one source, many questions

A section may declare passages, each bound to a run of questions. The passage
renders in the left pane and **keeps its scroll position and its highlights** as
the student moves between the questions bound to it. This is what a reading
section needs; duplicating a long passage into ten `stimulus` blocks bloats the
file and loses the highlights between questions.

```json
"passages": [
  {
    "id": "p1",
    "title": "On the Migration of Monarchs",
    "questions": ["q1", "q2", "q3"],
    "html": "<p>Each autumn…</p><p>Researchers have shown…</p>"
  }
]
```

- `html` is inserted as markup; use `text` instead for plain text with blank-line
  paragraph breaks.
- Bind questions either by listing their ids in `questions`, or by giving the
  question a `"passage": "p1"` field. The explicit field wins.
- A passage may carry its own `figure` and `caption`.
- For numbered source lines, use `<ol class="lines">`.

Several passages per section are fine — an AP Lang section with three sources is
three entries, each naming its own questions.

## Figures

Two shapes, both self-contained so a `.bbtest` stays one portable file. A figure
can hang off a question, a part, a stimulus, or a passage.

```json
"figure": {
  "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 240'>…</svg>",
  "alt": "A velocity-versus-time graph. The curve starts at v = 3 …",
  "caption": "Graph of $v(t)$"
}
```

```json
"figure": {
  "src": "data:image/png;base64,iVBORw0KGgo…",
  "alt": "A micrograph of onion root tip cells in various stages of mitosis.",
  "caption": "Onion root tip, 400×"
}
```

**Prefer SVG.** It is small, sharp at any zoom, and readable in the file. Reserve
data URIs for photographs and scans, and watch the file size — 8 MB is the limit.

**`alt` is required.** A figure nobody can describe is a figure a screen-reader
user cannot answer, and the results file records the description in place of the
drawing.

Rules the app enforces:

- Inline SVG is parsed and scrubbed before it is inserted. `<script>`, `on*`
  handlers, `<foreignObject>`, `<iframe>`, animation elements and
  `javascript:` URLs are removed. An SVG that will not parse is refused
  outright and the alt text is shown instead.
- `src` accepts **only** `data:` URIs of type png, jpeg, gif, webp or avif.
  `https://` URLs and `data:image/svg+xml` are both refused — the first because
  the app must work offline, the second because it would smuggle markup past
  the scrubber.
- Fixed `width`/`height` on the root `<svg>` are stripped so the figure scales
  with zoom; keep a `viewBox`.

## The answer key

Optional. When present, the app checks the discrete-answer questions at submit.

```json
"key": {
  "algo": "sha256-v1",
  "salt": "0740ddeca4e0…",
  "answers": {
    "q1": "9f2a…",
    "q2": "c41b…"
  }
}
```

Each value is `SHA-256(salt + ":" + questionId + ":" + canonicalAnswer)`, hex
encoded. The canonical form is always letter-based, which is why case, spacing
and option wording can never cause a disagreement:

| Type | Canonical form |
|---|---|
| `mcq`, `truefalse`, `dropdown` | `"B"` |
| `multi` | `"A,C"` — sorted, comma-joined |
| `matching` | `"1-B,2-C,3-A"` — sorted by left index |

**Do not write these by hand.** Open `/author.html` in the app, load the test,
type the plaintext answers, and it produces the block — or writes the whole
keyed file for you. It runs entirely in the browser; the plaintext answers never
leave the page.

Only questions the key names are counted. Keying 18 of 25 questions gives a
score out of 18, not a misleading 25.

### What the hashing is and is not

It stops a student reading the key out of the file or the devtools console. That
is all it does.

The salt ships with the file because the browser needs it to verify. With five
choices per question, anyone willing to write a five-iteration loop recovers the
whole key. **This is obfuscation, not security.** If a key genuinely must stay
secret, it cannot be in the browser at all.

## Math

Wrap in `$…$` for inline or `$$…$$` for display. KaTeX renders it.

**Double every backslash inside JSON strings.** `"$\\frac{1}{2}$"` is correct;
`"$\frac{1}{2}$"` is not. That second form does not error — JSON reads `\f` as a
formfeed and you get an invisible control character followed by `rac{1}{2}`, so
the math simply vanishes. The validator warns about it by name, and it is the
single most common way a generated test breaks.

The validator also warns when a string has an odd number of `$` delimiters,
because one unclosed delimiter renders the rest of the question as raw LaTeX.

Everything outside math delimiters is plain text and gets HTML-escaped.
`directions`, `reference`, and a passage's `html` are the exceptions that accept
HTML.

## IDs

Sequential and topic-neutral: `q1`, `q2`. The id appears in the results file and
is what the answer key is keyed by, so a descriptive id like
`q7-photosynthesis` narrows the answer before the student has picked one. Topic
tags belong outside the test file.

Ids must be unique across the whole test, not just within a section.

## Timing

Roughly 1.5 minutes per objective question plus 4 minutes per free response,
rounded to the nearest 5. Set `timeLimitMinutes: 0` or omit it for an untimed
section.

## Answered-state rules

`matching`, `fill`, `fields` and `parts` count as answered only when **every**
slot is filled, so the review page flags half-finished work. Every other type
counts as answered on first input.

## Limits

- 8 MB per file.
- No external requests of any kind. Everything the test needs is in the file.
