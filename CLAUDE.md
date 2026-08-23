# CLAUDE.md

Working notes for anyone — human or model — picking this repo up cold.

## What this is

A practice-test runtime styled after College Board's Bluebook exam app, hosted
as a static site on Cloudflare Pages. It is subject-agnostic: it renders any
test handed to it as a `.bbtest` file.

The app has two pages:

- **`/`** — sign-in (name + test file), then the exam itself.
- **`/author.html`** — the answer-key builder, for whoever writes the tests.

Nothing is uploaded anywhere. The test file comes off the person's disk, the
results file is saved back to it, and there is no server-side anything.

## The shape of it

```
index.html                the sign-in screen and the exam markup
author.html               the key builder
src/
  main.js                 boot: cache DOM, wire sign-in, wait for a test file
  core/       dom, state, clock, answers, icons, typeset
  ui/         screens, question, nav, toolbar, dialogs, highlight, reader,
              keyboard, split
  render/     one module per question type, plus figure.js and the registry
  calc/       panel, ti84, builtin, eval
  scoring/    hash.js (canonical form + SHA-256), score.js
  results/    describe.js, bbresult.js
  loader/     load.js (file picking), validate.js
  persist/    store.js (autosave + resume)
  signin/     the landing screen
  author/     the key builder
  styles/     one file per region; index.css imports them IN ORDER
public/                   _headers, _redirects, robots.txt, ti84.html
docs/                     the .bbtest and .bbresult specs, authoring guide, deploy
test/                     fifteen suites, `bash test/run.sh`
course/                   AP Calc BC specifics: unit map, schedule, style
shell/                    the old single-file runtime. SUPERSEDED — see below.
```

## Before you change anything

```bash
npm install && bash test/run.sh
```

Fifteen suites, all passing as of this writing. They exist because most of the
bugs in this project's history were invisible to reading.

### What the tests can and cannot see

`test/harness.mjs` boots the **real modules** inside jsdom — nothing is stubbed
except what jsdom genuinely lacks. So:

- Logic, DOM structure, state transitions, scoring, persistence, the results
  file → well covered.
- **Anything about computed geometry → not covered.** jsdom has no layout
  engine: `getBoundingClientRect` returns zeros and there is no canvas 2D
  context. A passing test never means something is positioned correctly.

Two harness rules worth knowing:

- **One boot per process.** The suites import the real module graph, which holds
  module-level state bound to one jsdom window. `run.sh` runs each suite in its
  own node process for exactly this reason. Do not "optimise" that away.
- **Do not cache-bust the imports.** A `?t=` query string creates a *second*
  copy of the graph, so the `state` the test holds is not the `state` the UI
  modules wired themselves against, and every `el.*` lookup comes back
  undefined. This cost an hour once already.

CSS `import` statements are stubbed by `test/css-stub-loader.mjs`, which is why
the suites are launched with `--import ./register-loader.mjs`.

## Traps that have actually bitten, in this codebase

Each of these shipped or nearly shipped. Most predate the rewrite and all of
them still apply.

**Splice indices out of order.** `s[:a] + new + s[b:]` silently duplicates a
whole block when `b < a`. It once produced two copies of `drawCalc`. Always
assert `b > a` before splicing.

**Patch scripts that write at the end.** A script that applies several
`str.replace` calls and writes the file last discards *every* successful edit if
a later anchor does not match and it raises. This happened four separate times.
Validate every anchor before mutating anything:

```python
missing = [label for old, _, label in EDITS if old not in s]
if missing:
    sys.exit("ABORT, nothing written. Missing: " + ", ".join(missing))
```

**Bash and Python heredocs eat backslashes.** Writing `"\\frac"` into a file
through a heredoc can land as `"\frac"`, which JS then reads as a formfeed. This
bit the test suite during the rewrite. Use the Edit tool for anything containing
LaTeX.

**JSON silently accepts `\f`, `\b`, `\t`, `\r`.** `"$\frac{1}{2}$"` with one
backslash parses fine and yields a formfeed followed by `rac{1}{2}` — no error
anywhere, the LaTeX just disappears. `src/loader/validate.js` detects this and
warns by name; keep that check.

**Cutting between two functions can delete a third.** Replacing everything from
`drawTiTab` to `drawHomeTab` once removed the `KEYS` array that happened to live
between them, breaking the calculator keypad. Every assertion still passed,
because they all checked that elements *existed*. `suite-calc.mjs` now presses
keys and reads the result instead. Write tests that do the same.

**CSS specificity beats source order.** `.hltoolbar button { background:#fff }`
(0-1-1) overrode `.sw-y { background:#ffe45c }` (0-1-0) no matter that the swatch
rule came later, so every highlight colour rendered white. Qualify:
`.hltoolbar button.sw-y`. Note that `src/styles/index.css` imports the region
files **in the original order** for exactly this reason — narrow.css must stay
last.

**`animation-fill-mode: both` overwrites a base `transform`.** The question
navigator is centred with `transform: translateX(-50%)`, and a shared `riseIn`
keyframe animating `transform: translateY(...)` wiped it out. Give such elements
their own keyframes that carry the base transform through.

**Third-party global stylesheets restyle everything.** Injecting TestNav's
`tn.css` to style the TI-84 emulator restyled the entire app. The emulator now
runs in `public/ti84.html`, its own page in its own frame. Never inject a foreign
application stylesheet into the exam document.

**A `srcdoc` iframe inherits the parent's CSP.** The TI-84 used to run from
`srcdoc`; the moment the app got a real Content-Security-Policy, `script-src
'self'` would have blocked TI's engine and the calculator would have failed with
no obvious cause. Hence the separate page, which carries its own policy from
`public/_headers`.

**Grid auto-placement moves siblings.** Hiding the clock with `display:none`
removed it from the top bar's grid, so the tools auto-placed into the empty
middle column. Pin columns explicitly rather than relying on child order.

**`mouseup` is followed by `click`.** A popup shown on `mouseup` gets hidden by
the outside-click handler in the same gesture. The highlight toolbar flashed and
vanished for several versions. `selectionchange` drives it now, and
`swallowClick` eats the one trailing click.

**Inline elements are sized by font metrics, not content.** A `<mark>` wrapping
typeset KaTeX came out too short for the formula. Such marks get
`display:inline-block` via `.hl-math`.

**Guard optional browser APIs.** An unguarded `window.matchMedia(...)` threw at
boot in an environment lacking it and took the whole app down before the first
question. `state.js` still guards it.

## Architecture notes

**State containers are mutated, never reassigned.** `meta`, `SECTIONS` and `Q`
in `core/state.js` are exported empty and filled in place by `buildModel()`.
Every other module holds a live binding to them; `Q = [...]` would leave every
importer pointing at the old array. `suite-model.mjs` asserts this.

**Circular imports are expected and fine.** `question.js` ↔ `highlight.js`,
`toolbar.js` ↔ `screens.js`, and others. ES modules handle it because nothing is
called at module-evaluation time — only inside functions, after boot. Keep it
that way: a top-level call into a cycle will throw a TDZ error.

**Sections are the organising unit.** Each owns its clock budget, calculator
policy, and directions.

**Clocks.** Every section has its own `left`, and exactly one function,
`clockRunning()`, decides whether time is passing (on a question, section has
time, no break or time-up notice open). Every screen change calls `syncClock()`.
Do not reintroduce per-callsite start/stop; that caused two separate
freeze/reset bugs.

**Narrow windows** key off one breakpoint, `max-width: 860px`, shared between the
CSS and `isNarrow()`. Under it, tools collapse into the More menu and a question
with a passage becomes two flippable pages plus a stacked option.

**Passages** are declared on a section and bound to a run of questions. The left
pane is deliberately **not** rebuilt while you move between questions sharing a
passage — that is what preserves scroll position and the live highlight marks.
`question.js` tracks this with `leftKey`; `suite-passages.mjs` asserts the DOM
node is literally identical across those questions.

**Persistence** writes to `localStorage` every couple of seconds. Remaining time
is stored as **seconds left, not as a deadline**, so reloading neither gives time
back nor takes it away. Only one test is held at a time.

## The answer key

The app scores `mcq`, `truefalse`, `multi`, `dropdown` and `matching` when the
`.bbtest` carries a `key` block. Everything written still goes to a human.

Each answer is stored as `SHA-256(salt : questionId : canonicalAnswer)`, where
the canonical form is always letter-based (`"B"`, `"A,C"`, `"1-B,2-C,3-A"`) so
case and wording can never cause a mismatch between the key builder and the
runtime.

**Be honest about what this is.** The salt ships with the file because the
browser needs it to verify, and five choices is a five-iteration brute force.
It stops a student reading the key out of the file. It is not security, the docs
say so, and the author page says so. Do not let that claim drift.

## Conventions for generated tests

Full detail in `docs/test-file-format.md` and `docs/authoring-questions.md`.
The short version:

- **Five choices, A–E** for AP-style packets. `Does not exist` and `It cannot be
  determined` are legitimate, often-correct options.
- **Mathematical answers use the `math` type**, never `short`.
- **A prompt asking for N things gets N inputs** via `fields`.
- **Figures are supported now** — inline SVG preferred, base64 data URIs for
  real photographs. `alt` is required and must contain what the question turns
  on. Hosted image URLs are refused on purpose.
- **The answer key is built separately** at `/author.html` and never sits in
  plaintext in the test file.

## `shell/practice-test-shell.html` is superseded

That file is the original single-file runtime. Every line of it now lives in
`src/`, and nothing builds from it or tests against it any more. It is kept only
as a reference during the transition and can be deleted once you are confident
in the rewrite. **Do not edit it expecting the app to change.**

## Style

Match what is there: no framework, plain functions, ES modules, CSS custom
properties for the palette. Comments explain *why* — especially where a
non-obvious constraint forced a shape, since most of this codebase's oddities
are load-bearing.
