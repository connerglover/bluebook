# Question Style — AP Calculus BC (Carmel, Per E)

How this teacher writes questions. Match these conventions so a practice test feels like the real one.

## Voice

- Direct imperatives: "Find," "Show that," "Determine," "Identify," "Graph," "Construct," "Solve."
- Justification is asked for explicitly and often: "Justify your answer," "Give a reason for your answer," "Explain how your answer is consistent with the Extreme Value Theorem."
- Theorems get named in the question when they're the point: Extreme Value Theorem, Mean Value Theorem, Intermediate Value Theorem, Sandwich Theorem, Fundamental Theorem of Calculus.
- No story framing for its own sake. Contexts appear when they carry the math — falling objects, particle motion, temperature tables, daylight hours, population.

## Structure

- Free response is multi-part and lettered (a), (b), (c) — usually 2–4 parts. Later parts routinely depend on earlier ones.
- Parts escalate: compute, then justify, then generalize or interpret.
- A single stem often carries several numbered problems of the same type ("For problems 1–4, use the Trapezoidal Rule with n = 4…"). In a practice test, split these into separate questions.
- Tables of values are common — motion data, temperature by hour, f′ at selected x. Use the `stimulus.table` field for these.
- Graph-based questions are frequent. The runtime renders figures now: author the graph as
  inline SVG in the question's `figure` field, with `alt` text complete enough to answer from.
  If you are not confident in the drawing, fall back to describing the graph fully in words
  or giving a table of values. Never write "the graph shown" with nothing to show.

## Conventions

- Exact answers are the default. Decimals appear only when the problem says "approximate" or "estimate."
- Intervals in bracket notation: [0, 4], (−1, 5).
- Function names are f, g, h; parameters a, b, c, k; time t; the constant of integration C.
- Units are carried through applied problems (m/sec, feet, degrees F, months).
- "Confirm your answer algebraically" and "confirm using a graph" show up on calculator-allowed work.
- On no-calculator assessments (Unit 6 test, 7.1–7.3 quiz), keep every number clean — integer or simple fractional answers, no arithmetic that needs a calculator.

## Multiple choice

This is the single most distinctive thing about the packets — **every unit's AP review problems use five choices, (A) through (E)**, not four. Match that.

- Answers run inline on one line in the packets: `(A) -1 (B) 1 (C) 2 (D) 5 (E) Does not exist`.
- `Does not exist`, `It cannot be determined`, and `nonexistent` are real, frequently-correct choices — not throwaways. Use them honestly.
- Roman-numeral items show up regularly: a stem lists I, II, III statements and the choices are `I only`, `II only`, `III only`, `I and III only`, `I and II only`.
- On calculator-active questions the choices are decimals to three places (`3.750`, `4.066`, `-0.099`), and the distractors are near-misses from a plausible wrong setup rather than round numbers.
- Packet headings read "Unit N AP Exam Questions: Multiple Choice", followed by a "Free Response" block. Two sections, same order, is the shape to mirror.

## Answer inputs

The packets ask for exact mathematical objects — intervals, equations, expressions, exact values.
Those go in `math` fields so they render properly and record as LaTeX.

The teacher also routinely asks for several things in one breath: "state the amplitude, period,
and phase shift", "state the domain and range", "find the maximum value of $y$ and the smallest
positive $x$ at which it occurs". Every one of those is a `fields` group with a labelled input per
quantity — never one box holding all of them.

"Justify your answer" appears constantly and is usually attached to a question that also wants a
value. That pairing is a `fields` group too: a `math` field for the value, an `essay` for the
reasoning, so the two get graded separately.

## Distractors

Build wrong choices from the errors the packets call out, not from filler:

- Sign errors in chain rule and implicit differentiation
- Dropping the inner derivative
- Endpoint omitted on a closed-interval extremum problem
- f′ conclusion where f″ was needed, and vice versa
- Speed vs velocity
- Over/underestimate reversed on a trapezoidal approximation
- Missing +C, or limits not changed after a u-substitution
- Radius vs diameter in a volume problem

## Test shape

Match what the teacher does: 12–15 objective questions (five choices each) and 6–8 free response for a test; 6–8 and 3–4 for a quiz; 20–25 and 10–12 for the final. Free response is **not** AP-style scored — it's the teacher's own multi-part format.
