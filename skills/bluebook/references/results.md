# The `.bbresult.json` format

What the app saves when a test is submitted. It replaces the copy-paste
"PRACTICE TEST RESULTS" text block the old single-file runtime printed.

The `.json` suffix is deliberate: chat upload filters routinely reject
extensions they do not recognise, and a bare `.bbresult` gets bounced.

## Shape

```json
{
  "format": 1,
  "kind": "bbresult",
  "generatedAt": "2026-08-22T21:14:08.221Z",
  "generatedAtLocal": "8/22/2026, 9:14:08 PM",

  "test": {
    "title": "Unit 4 Test",
    "course": "AP Calculus BC",
    "id": "t1f3k9x2",
    "file": "unit-4.bbtest",
    "gradingNote": null
  },
  "tester": "Conner Glover",

  "timing": {
    "totalSecondsUsed": 1620,
    "totalDisplay": "27:00",
    "startedAt": "2026-08-22T20:47:08.100Z",
    "timersEnabled": true
  },

  "progress": {
    "answered": 22,
    "total": 25,
    "unanswered": [8, 19, 24],
    "markedForReview": [4, 19]
  },

  "autoScore": {
    "scored": 18,
    "correct": 14,
    "incorrect": 3,
    "blank": 1,
    "percent": 77.8,
    "perQuestion": [
      { "id": "q1", "number": 1, "type": "mcq", "status": "correct" },
      { "id": "q3", "number": 3, "type": "mcq", "status": "incorrect" }
    ]
  },

  "sections": [
    {
      "name": "Section I, Part A",
      "label": "No Calculator Allowed",
      "calculator": false,
      "timeLimitMinutes": 30,
      "timeUsedSeconds": 1740,
      "questions": [
        {
          "number": 1,
          "id": "q1",
          "type": "mcq",
          "answer": "C",
          "answered": true,
          "markedForReview": false,
          "issue": null
        }
      ]
    }
  ],

  "disputed": [
    { "number": 12, "id": "q12", "note": "Two of these look correct to me." }
  ],

  "marginNotes": [
    { "question": 7, "quote": "the internal clock", "note": "compare to the magnetic sense" }
  ]
}
```

## Fields worth knowing

**`autoScore`** is `null` when the test carried no answer key. It never covers
free response — only `mcq`, `truefalse`, `multi`, `dropdown` and `matching`,
and only the ones the key actually named. `scored` is the denominator; do not
use `progress.total`.

**`answer`** is a human-readable rendering, not the raw internal value:

| Type | Example |
|---|---|
| `mcq` | `"C"` |
| `truefalse` | `"A (True)"` |
| `multi` | `"A, C"` |
| `dropdown` | the chosen option's text |
| `matching` | `"1->B, 2->C, 3->A"` |
| `fill` | `"[differentiation] [integration]"` |
| `fields` | `"Amplitude = 3; Period = \\pi"` |
| `math` | the LaTeX the student entered |
| `essay` | plain text, markup flattened |
| unanswered | `"BLANK"` |

For a `parts` question, `answer` is an **array** of
`{ part, label, type, value }` rather than a string.

**`disputed`** is the list of questions the test-taker flagged with "Note an
issue". Re-check these before scoring them — a question the student disputes is
sometimes a question that is actually wrong, and marking it incorrect by default
is how a bad item survives.

**`timeUsedSeconds`** is per section and counts only time spent sitting on a
question in that section, not time on breaks or the review page.

## Grading it

Nothing in this repo grades a result file — that is deliberate. Hand it to
whoever (or whatever) is doing the grading along with the plaintext answer key,
which lives outside the test file.
