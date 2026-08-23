# Writing the questions

The runtime is solved. What makes a practice test worth sitting is the questions, and that's
where generated tests usually fall down. This file is about the failure modes.

For the file format itself, see [test-file-format.md](./test-file-format.md).

## Match the real assessment's shape

Before writing, know what the actual test looks like: how many choices per question, whether free
response is multi-part, whether justification is demanded, whether answers are exact or decimal.
If the person has past tests or a syllabus, that's the source. A five-choice course tested with
four-choice questions feels wrong immediately, and the person notices before question three.

When you have no signal, defaults that work: four or five choices, a mix of objective and free
response, roughly 12–15 objective and 6–8 free response for a full test, half that for a quiz.

## Distractors carry the whole question

A multiple-choice question is only as good as its wrong answers. Each distractor should be the
result of a specific, plausible mistake:

- The right method with a sign error
- A step omitted — the inner derivative, the endpoint check, the constant of integration
- The right computation answering a slightly different question — speed when velocity was asked
- A near-miss numerical value from a wrong setup, on calculator-active questions
- The correct answer to the previous part, when parts build on each other

Filler distractors — round numbers with no derivation, obviously wrong statements — teach nothing
and make the question free. If you can't name the mistake a distractor represents, replace it.

Avoid "all of the above" and "none of the above." They test test-taking, not the subject.
"Does not exist," "cannot be determined," and "no solution" are different: they're legitimate and
often correct, so use them honestly rather than as throwaways.

Spread correct answers across positions. Three C's in a row is a tell.

## Two defaults, before anything else

**Mathematical answers take a `math` input.** Not `short`. A plain text box records what the keys
produced — `[-inf, 4]`, `pi/6`, `x^2+1` — which is worse to read, worse to grade, and nothing like
what the person would write on paper. A `math` field renders as they type and records LaTeX.
`short` is for a word or a name: "even", "the Mean Value Theorem", "concave down".

**A prompt asking for N things takes `fields`, with N labelled inputs.** This is the single
biggest quality difference between a test that feels real and one that feels generated.

Assume `math` and `fields` are correct and justify the exception, rather than the other way round.

## Count what the prompt asks for, then give it that many inputs

The most common way a generated test goes wrong is a prompt that asks for three things wired to
one answer box. The test-taker ends up typing `period: 12. b: pi/6` into a math field, which
renders as nonsense and grades as one blob instead of two answers.

Read each prompt and count the distinct things being asked. That count is how many inputs it
needs. Use `fields` for anything above one.

| The prompt says | Give it |
|---|---|
| "State the amplitude, period, and phase shift" | `fields` — three `math` inputs |
| "State the domain and range" | `fields` — two `math` inputs |
| "Find the max value of $y$ and the $x$ where it occurs" | `fields` — two `math` inputs |
| "What is the greatest whole number of hours? Justify your answer." | `fields` — a `math` input and an `essay` |
| "Determine whether $h$ is even, odd, or neither, and justify" | `fields` — a `dropdown` and an `essay` |
| "State the domain of $f$" | one `math` input |

Two rules fall out of this:

**Reasoning gets its own box.** "Justify," "explain," "show that," "verify," "prove," "give a
reason" all mean the answer is *work*, not a value. If the prompt asks for a value *and* a
justification, that's two fields. A verb like "verify" on its own means the entire answer is
reasoning — give it an `essay`, never a `math` field, because there's no value to type.

**Mathematical answers get `math`, always.** A domain typed into a plain `short` box comes back as
`[-inf, 4]`. In a `math` field it comes back as proper notation and renders as the test-taker
types. Use `short` only when the answer is a word or a name — "the Mean Value Theorem," "even."

Be consistent about this within a test. If Part A and Part B both ask for a domain, they get the
same input type. Inconsistency between structurally identical questions is jarring and reads as
carelessness.

There is no build script any more: the app validates a `.bbtest` when it loads one, and the
checks it runs are mechanical (unclosed math, missing choices, bad types). Splitting a question
that asks for three things into three inputs is a judgment call, and it is yours.

## Use the type that fits the thinking

There are eleven types because different knowledge is tested differently. A test that is all
`mcq` and `essay` wastes them:

- `matching` — vocabulary, classification, pairing causes with effects
- `fill` — formulas, definitions, anything where recall of exact terms matters
- `multi` — "select all that apply" genuinely tests whether they know the boundary of a concept
- `math` — when notation *is* the answer; the field records LaTeX
- `dropdown` — a long option list that would be unwieldy as radio buttons
- `parts` — the standard multi-step free response, escalating from compute to justify to interpret
- `fields` — one prompt, several labelled answers; the fix for any question asking for more than one thing
- `truefalse` — sparingly, and only for claims where the false version is a real misconception

## Figures: draw it, or describe it completely

The runtime renders figures now, which changes the old advice. Two ways to get one in:

**Author it as SVG.** This is the right default for anything diagrammatic — a graph, a
free-body diagram, a circuit, a geometric construction, a labelled cell. It is a few hundred
bytes, it stays sharp at any zoom, and you can read it in the file to check it. Give the root a
`viewBox` and no fixed `width`/`height`.

**Embed a photograph as a base64 data URI.** Only when a real image is genuinely required — a
micrograph, a primary-source scan, a work of art. These are large; watch the 8 MB file limit.

Whichever you use, `alt` is not optional and is not a caption. Write it so that someone who
cannot see the figure can still answer the question:

> `"alt": "A velocity-versus-time graph. The curve starts at v = 3 when t = 0, decreases
> steadily, crosses the horizontal axis at t = 4, and reaches about v = -2 at t = 6."`

Not `"alt": "a graph of velocity"`. If the alt text does not contain the information the question
turns on, the question is unanswerable for some readers and the figure is decoration.

If you cannot produce a figure you trust, the old advice still applies: describe the graph
completely in words, or give a table of values. Never write "the graph shown" with nothing to
show.

## Passages: one source, many questions

For a reading section, declare the passage once on the section and bind a run of questions to it,
rather than repeating a `stimulus` on each question. The passage then keeps its scroll position
and the student's highlights as they move between its questions — which is most of what makes a
reading section bearable.

Question order matters here: a passage's questions should be contiguous, and should move through
the text roughly in order, the way a real reading section does.

## Free response should escalate

Parts (a), (b), (c) work best as: compute something, then justify it, then extend or interpret.
If part (b) depends on part (a), say so in the rubric so a correct method on wrong input still
earns credit.

Ask for justification explicitly when you want it — "Give a reason for your answer," "Justify your
answer." Graders can only award what was asked for.

## No-calculator sections need clean numbers

If a section is `calculator: false`, every number in it must be workable by hand. Integer or
simple fractional answers, no arithmetic that wants a calculator. This is the single most common
way a generated no-calculator section becomes unusable.

## Self-check before building

- Exactly one defensible correct choice per `mcq`, and you can say why each distractor is wrong
- `multi` questions: is the intended count of correct answers unambiguous from the wording?
- `matching`: no right-hand option that plausibly fits two left-hand items
- `fill`: each blank has one unambiguous answer, or the rubric says what else counts
- Every figure carries `alt` text that would let someone answer the question without seeing it
- Correct answers spread across positions
- Calculator policy matches the real assessment
- Every `$` and `$$` closes; every backslash doubled
- Question types varied

The app's loader catches the mechanical items — unclosed math, missing choices, bad types,
duplicate ids, the single-backslash LaTeX trap. The judgment items above are yours.
