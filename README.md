# Bluebook practice-test runtime

A practice-test app styled after College Board's Bluebook exam software, hosted
as a static site. You give it a small `.bbtest` file; it gives you a timed,
sectioned exam with a question navigator, mark-for-review, highlights and notes,
a line reader, math typesetting, and a graphing calculator — and saves your
answers to a file when you finish.

It is subject-agnostic. It was built for one student sitting AP Calculus BC, but
nothing in the runtime knows or cares what the subject is.

> **Unofficial.** Not affiliated with, endorsed by, or connected to College
> Board. "Bluebook" is their trademark, used here only to describe the interface
> this tool imitates.

## How it is used

1. Someone writes a test as a `.bbtest` file — a few KB of JSON.
2. If they want the multiple choice auto-checked, they run it through
   `/author.html` to attach a scrambled answer key.
3. The student opens the site, types their name, and picks the file.
4. They sit the test.
5. At the end the app saves a `.bbresult.json` they hand to whoever is grading.

The test file never contains plaintext answers, so it is safe to send directly
to the person taking the test.

## Running it

```bash
npm install
npm run dev
```

```bash
bash test/run.sh
```

Deploying is `npm run build` and a Cloudflare Pages project pointed at `dist/`.
See [docs/deploy.md](docs/deploy.md).

## What is in the app

**Question types** — `mcq`, `multi`, `truefalse`, `dropdown`, `matching`,
`fill`, `short`, `essay`, `math` (a live LaTeX editor), `parts` for multi-part
free response, and `fields` for one prompt with several labelled answers.

**Passages** — a section can declare a long source text bound to a run of
questions. It keeps its scroll position and your highlights as you move between
them, the way a real reading section does.

**Figures** — inline SVG or embedded base64 images, both carried inside the test
file. Author-supplied SVG is scrubbed before it is rendered.

**Auto-scoring** — when the test file carries a key, the app checks every
question with a fixed set of choices. The author decides whether the student
sees the score, just the total, or nothing at all. Free response is never scored
here.

**Saved progress** — answers, highlights, notes and the remaining clock are
saved as you work. Closing the tab does not lose them.

**Calculators** — TI's own TI-84 Plus CE emulator, loaded at runtime in an
isolated frame, with a built-in scientific and graphing calculator as the
offline fallback. Only available in sections whose file says a calculator is
allowed.

**Clocks** — one per section, hideable, and nothing stops you when time runs
out; it asks whether you want to keep working.

## Documentation

| File | What it covers |
|---|---|
| [docs/test-file-format.md](docs/test-file-format.md) | The `.bbtest` format — the contract the app validates against |
| [docs/authoring-questions.md](docs/authoring-questions.md) | Writing questions that are worth sitting |
| [docs/results-file-format.md](docs/results-file-format.md) | The `.bbresult.json` the app saves |
| [docs/deploy.md](docs/deploy.md) | Cloudflare Pages setup and the header rules |
| [CLAUDE.md](CLAUDE.md) | Architecture, and the traps that have actually bitten |

`course/` holds AP Calculus BC specifics — unit map, schedule, house style —
for whoever is writing tests for that course.

## A note on the answer key

Keys are stored as salted SHA-256 hashes so a student cannot read them out of
the file or the devtools console.

That is all it does. The salt has to ship with the file for the browser to
verify against it, and with five choices per question anyone willing to write a
five-iteration loop recovers the whole key. It defeats a casual look and nothing
more. If a key genuinely must stay secret, it cannot be in the browser at all.

## Layout

```
index.html      author.html      sign-in + exam, and the key builder
src/            the runtime, as ES modules
public/         static files and the Cloudflare header rules
docs/           formats, authoring, deployment
test/           fifteen suites, run with test/run.sh
course/         AP Calculus BC course material
shell/          the original single-file runtime — superseded, kept for reference
```
