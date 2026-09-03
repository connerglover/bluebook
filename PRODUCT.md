# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is **one student, studying alone**: they open the site, type
their name, pick a `.bbtest` file off their own disk, and sit a timed exam
without supervision. Everything about the runtime assumes that person is by
themselves at a desk with the clock running.

A second person exists but is not the design target: whoever writes the test —
a tutor, a teacher, a parent, or Claude via `skills/bluebook/` — authors the
`.bbtest`, optionally attaches a scrambled key at `/author.html`, and reads the
`.bbresult.json` afterwards. `/author.html` is their surface, not the student's.

## Product Purpose

A timed, sectioned practice-exam runtime that renders whatever test file it is
handed, in an interface modelled on College Board's Bluebook.

Success is **breadth**: any subject, any test. The interface looks like Bluebook
so the student is not learning a new tool while also being examined, but the
product is the runtime, not the imitation — it succeeds when a wide range of
question types and test shapes can be authored quickly and sat faithfully. It
was built for one student sitting AP Calculus BC and nothing in the runtime
knows or cares what the subject is; keeping it that way is the point.

## Positioning

A practice test runs entirely in the browser, off a file the student already
has. There is no account, no upload, no backend, and no test bank — the test is
a few KB of JSON that someone wrote for this student, and the result is a file
handed back to whoever is grading. Commercial practice platforms own the
content and the account; this owns neither.

The other half of the position is the question-type range: `mcq`, `multi`,
`truefalse`, `dropdown`, `matching`, `fill`, `short`, `essay`, `math` (a live
LaTeX editor), `parts`, and `fields` — plus passages, figures, and a real TI-84
Plus CE emulator — so a test does not have to be reshaped to fit the tool.

## Operating Context

1. Someone writes a test as a `.bbtest` file.
2. If the multiple choice should be auto-checked, they run it through
   `/author.html` to attach a salted-hash answer key.
3. The student opens the site, types their name, and picks the file.
4. They sit the test — timed, one clock per section, with mark-for-review,
   the question navigator, highlights, notes, a line reader, and a calculator
   where the section allows one.
5. The app saves a `.bbresult.json` they hand to whoever is grading.

The exam is sat in one long uninterrupted session with a clock the student can
hide. Progress (answers, highlights, notes, seconds remaining) autosaves to
`localStorage`, so closing the tab is survivable. Course-specific material —
unit maps, schedules, house style — lives with whoever writes tests for that
course, not in this repo.

## Capabilities and Constraints

- **Two pages.** `/` is sign-in then the exam; `/author.html` is the key
  builder. Nothing else.
- **Fully static.** Built with Vite, deployed to Cloudflare (Workers static
  assets), no server-side anything. Not marked non-negotiable by the user, but
  it is what exists today and every design decision so far assumes it.
- **Sections are the organising unit** — each owns its clock budget, its
  calculator policy, and its directions.
- **Auto-scoring covers fixed-choice questions only** (`mcq`, `truefalse`,
  `multi`, `dropdown`, `matching`) and only when the file carries a key. Free
  response is never scored; it goes to a human.
- **Answer keys are obfuscated, not secret.** Salted SHA-256, salt shipped in
  the file because the browser must verify against it. The repo's standing rule
  is that the docs and the author page say so plainly and that claim never
  drifts.
- **The narrow breakpoint is 860px**, shared between the CSS and `isNarrow()`.
  Under it tools collapse into a More menu and a passage question becomes two
  flippable pages.
- **The TI-84 emulator runs in its own page** (`public/ti84.html`) in its own
  frame with its own CSP. Foreign application stylesheets are never injected
  into the exam document.
- **Hosted image URLs in test files are refused on purpose**; figures are inline
  SVG (scrubbed) or embedded base64.
- Tests run in jsdom and cover logic, not geometry: no layout engine, no canvas.
  A passing suite never proves anything is positioned correctly.

## Brand Commitments

- **Visual fidelity to Bluebook is non-negotiable.** The exam screen must keep
  matching College Board's app closely. Redesigning its look breaks the product:
  the whole reason a student practises here is that nothing about the interface
  is a surprise on exam day. Refinement, never replacement, on the exam surface.
- **The unofficial framing stays visible and honest.** Not affiliated with,
  endorsed by, or connected to College Board; "Bluebook" is their trademark,
  used only to describe the interface this tool imitates. That language must
  survive any future work.
- Named "Bluebook Simulator" in the README; the app's own title is
  "Practice Test".
- No claimed relationship, endorsement, or College Board branding may ever be
  added.

## Evidence on Hand

- The working app: `index.html`, `author.html`, `src/` (no framework, ES
  modules, CSS custom properties).
- Format contracts: `docs/test-file-format.md`, `docs/results-file-format.md`,
  `docs/authoring-questions.md`, `docs/deploy.md`.
- Fifteen test suites, `bash test/run.sh`.
- `CLAUDE.md` — architecture plus the traps that have actually shipped here.
- `skills/bluebook/` — the Claude skill that authors `.bbtest` files and reads
  results.

There are no users, no usage numbers, no testimonials, and no public deployment
claims. Do not invent any.

## Product Principles

1. **A file in, a file out.** Nothing is uploaded and nothing is kept. The test
   comes off the student's disk and the result goes back to it.
2. **Subject-agnostic runtime.** Nothing in the app may learn what subject it is
   rendering. Course material belongs to whoever writes the tests.
3. **The exam screen is not a design canvas.** Fidelity to Bluebook outranks
   expression there; the student is being examined, not shown an interface.
4. **Say what it actually is.** Unofficial, and the key is obfuscation. Neither
   claim is allowed to soften.
5. **Constraints in this codebase are load-bearing.** Most of its oddities exist
   because something broke. Read the why before changing the shape.

## Accessibility & Inclusion

No product-specific standard was established. The exam is sat under time
pressure by a single user, so keyboard operability and legibility under the
existing Bluebook-matched type scale are the practical floor.
