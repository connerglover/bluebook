---
name: Bluebook Simulator
description: A faithful copy of College Board's Bluebook exam interface, driven by a local test file.
colors:
  exam-chrome-periwinkle: "#e9edf8"
  sanctioned-blue: "#2f5fd0"
  sanctioned-blue-pressed: "#24499f"
  sanctioned-blue-wash: "#eaeffc"
  invigilator-navy: "#1c2c5b"
  sign-in-indigo: "#3f4ec7"
  sign-in-indigo-deep: "#3341ad"
  flag-crimson: "#c8102e"
  alert-wash: "#fad4d9"
  alert-ink: "#7d1620"
  annotation-amber: "#a85c00"
  annotation-wash: "#fff6e8"
  proctor-gold: "#ffd400"
  booklet-ink: "#1b1b1b"
  muted-ink: "#5a5a5a"
  hairline: "#c9c9c9"
  rule-grey: "#6f6f6f"
  panel-grey: "#f5f5f5"
  paper: "#ffffff"
  highlighter-yellow: "#ffe45c"
  highlighter-blue: "#bfe3fb"
  highlighter-pink: "#fcc9dd"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.2
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "31px"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  reading:
    fontFamily: "Source Serif 4, Source Serif Pro, Georgia, Times New Roman, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.62
  clock:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.15
    fontFeature: "tabular-nums"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.06em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "9px"
  lg: "12px"
  xl: "16px"
  button: "24px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
  xl: "26px"
components:
  button-primary:
    backgroundColor: "{colors.sanctioned-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "9px 26px"
  button-primary-hover:
    backgroundColor: "{colors.sanctioned-blue-pressed}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sanctioned-blue}"
    rounded: "{rounded.button}"
    padding: "9px 26px"
  button-ghost-hover:
    backgroundColor: "{colors.sanctioned-blue-wash}"
    textColor: "{colors.sanctioned-blue}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.booklet-ink}"
    rounded: "{rounded.button}"
    padding: "9px 26px"
  button-gold:
    backgroundColor: "{colors.proctor-gold}"
    textColor: "{colors.booklet-ink}"
    rounded: "{rounded.pill}"
    padding: "15px 20px"
  choice-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.booklet-ink}"
    typography: "{typography.reading}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "52px"
  choice-row-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.booklet-ink}"
    rounded: "{rounded.md}"
  input-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.booklet-ink}"
    typography: "{typography.reading}"
    rounded: "{rounded.md}"
    padding: "11px 13px"
  nav-question-box:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sanctioned-blue}"
    rounded: "{rounded.xs}"
    size: "44px"
  nav-question-box-answered:
    backgroundColor: "{colors.sanctioned-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xs}"
    size: "44px"
  tool-tab:
    backgroundColor: "transparent"
    textColor: "{colors.booklet-ink}"
    rounded: "7px 7px 0 0"
    padding: "7px 12px 9px"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.booklet-ink}"
    rounded: "{rounded.lg}"
    padding: "20px 26px 26px"
---

# Design System: Bluebook Simulator

## Overview

**Creative North Star: "The Faithful Copy"**

This system has no independent taste, and that is the design decision. It is an
imitation of College Board's Bluebook exam application, and every rule in this
file reduces to *because Bluebook does it*. A student practises here so that
nothing about the interface is a surprise on exam day; the moment a decision is
made because it would look better, the product has failed at its only job.

That gives the system an unusual authority structure. The incumbent
implementation is not merely the current state — it is the specification. Where
this file and the code disagree, the code wins and this file is stale. Novel
surfaces that Bluebook has no equivalent for — the sign-in screen, the
answer-key builder — are assembled out of the same vocabulary rather than
invented fresh.

Underneath the imitation there is a consistent logic, which is what makes it
extendable. Chrome is periwinkle-grey and sans-serif; content is white and
serif; the two never blend. Depth is drawn, not lit — the boundary between
chrome and content is a *dashed black rule*, not a shadow. Controls are heavy
and unambiguous: 2px borders, 52px choice rows, a 44px navigator square, a
solid black number block. A student under a running clock must never misread a
target, so nothing here is subtle, low-contrast, or small.

**Key Characteristics:**

- Two type worlds: system sans for chrome, Source Serif 4 for anything the
  student reads or answers.
- Dashed black hairlines (20px on / 6px off) as the signature separator between
  chrome and content.
- Flat by default; shadow only on layers that genuinely float.
- Blue means *you did this*; crimson means *time or flag*; amber means *note*;
  gold means *go*.
- Oversized hit targets and 2px borders throughout.
- One accent per state — never two competing colors on one control.

## Colors

An institutional palette: cool periwinkle chrome, white paper, one saturated
blue for every affirmative state, and three loud signal colors used sparingly.

### Primary

- **Sanctioned Blue** (`--blue`): every affirmative state. Selected choice
  border and letter disc, answered navigator square, active tool underline,
  focus outlines, links, primary buttons. It is the only color that means "you
  did this."
- **Sanctioned Blue Pressed** (`--blue-dark`): primary button hover only.
- **Sanctioned Blue Wash** (`--blue-soft`): ghost-button hover, the focus glow
  ring on sign-in inputs, the score card ground.
- **Invigilator Navy** (`--navy`): the institution's voice — preview banner,
  More-menu items, accordion headings, the score figure. Reads as the
  organisation talking rather than the app responding.

### Secondary

- **Proctor Gold** (`--yellow`): the go-forward action. The sign-in start
  button and `.btn.gold`. Rare and unmistakable; also the note-card header
  fill. Gold never carries body text and never appears twice on one screen.
- **Sign-in Indigo** (`--si-blue` / `--si-blue-deep`): the full-bleed field of
  the sign-in page only. It never appears inside the exam.

### Tertiary

- **Flag Crimson** (`--flag`): marked-for-review flags, the low-time clock, the
  time-up banner. Alarm only.
- **Alert Wash / Alert Ink** (`--redbg` / `--redink`): the
  calculator-prohibited banner and sign-in file errors. Stated firmly, not
  shouted.
- **Annotation Amber / Annotation Wash** (`--note` / `--note-soft`): the
  student's own marginalia — note markers, and the underline beneath an
  annotated highlight.
- **Highlighter Yellow / Blue / Pink** (`#ffe45c` / `#bfe3fb` / `#fcc9dd`):
  literal highlighter ink over passage text. Backgrounds only, never chrome.

### Neutral

- **Exam Chrome Periwinkle** (`--bar`): the top and bottom bars, and nothing
  else. It is what tells the student where the exam frame ends.
- **Paper** (`#fff`): every content surface, card, sheet, popover, and input.
- **Booklet Ink** (`--ink`): body text, and the solid fill behind the question
  number and the navigator toggle.
- **Muted Ink** (`--ink-soft`): field labels, hints, autosave text, captions.
- **Hairline / Rule Grey** (`--line` / `--rule`): solid dividers, table
  borders, the pane divider.
- **Panel Grey** (`--panel`): recessed strips — the summary block, `kbd` keys,
  quiet-button hover.

### Named Rules

**The One Affirmative Rule.** Blue is reserved for states the student caused.
Never use it for decoration, for headings, or to make a surface look nicer. If
a blue element does not mean "answered, selected, active, or focused," it is
wrong.

**The Chrome Boundary Rule.** Periwinkle appears only on the top and bottom
bars. A periwinkle card, panel, or content surface breaks the single strongest
orientation signal in the interface.

**The Signal Scarcity Rule.** Crimson, gold, and amber each carry exactly one
meaning — alarm, go, annotation — and none may appear more than once on screen
at a time.

## Typography

**Display / Chrome Font:** system UI stack (`-apple-system`, `Segoe UI`,
`Roboto`, `Helvetica Neue`, Arial)
**Reading Font:** Source Serif 4 (with Source Serif Pro, Georgia, Times)
**Mono:** `ui-monospace`, Menlo, Consolas — error detail and the results
textarea only.

**Character:** The pairing is the whole typographic idea. The system sans is
the application talking: labels, timers, buttons, navigation. The serif is the
exam talking: stems, passages, choices, and every answer the student types. A
student should be able to tell at a glance whether they are reading the tool or
reading the test.

### Hierarchy

- **Display** (600, 33–36px): the one-per-screen title on the intro, finish,
  and review screens. Never inside a question.
- **Headline** (800, 31px): the sign-in card heading; the review screen's 34px
  title.
- **Title** (700, 18–19px, -0.01em): the section title in the top bar, sheet
  headings, and passage titles (serif, 20px).
- **Body** (400, 17px / 1.55): sans-serif chrome prose — directions, preview
  rows, menu items.
- **Reading** (400, 1.06em ≈ 18px / 1.62, serif): question stems and stimuli,
  choices (1.02em), passages (17px / 1.72). The solo pane caps at 790px, which
  lands near 70ch.
- **Clock** (600, 22px, tabular-nums): the timer, and the 56px break countdown.
  Tabular figures are mandatory — a clock whose digits shift width is a defect.
- **Label** (700–800, 12–13.5px, +0.06em, uppercase): field labels, navigator
  group headings, the notes-pane header, banner text, the score caption.

### Named Rules

**The Two Voices Rule.** Serif is the test; sans is the tool. Anything the
student reads to answer a question, or types as an answer, is serif. Anything
the application says about itself is sans. Never mix them inside one block.

**The Zoomable Content Rule.** Question content sizes in `em` off a
`--zoom`-scaled root (`.zoomable`), so the text-size control scales the exam and
not the chrome. Never hard-code `px` font sizes inside question rendering.

## Layout

A fixed three-band application shell: a periwinkle top bar, a scrolling middle,
and a periwinkle bottom bar, filling `100dvh` with flex. Only the middle
scrolls. Both bars are `display:grid` with `1fr auto 1fr` and **explicitly
pinned columns** — the clock can be hidden, and auto-placement would otherwise
slide the tools into the vacated middle.

The middle is either a single centred column (`max-width: 790px`) or a split
pane: passage left at 50%, question right, separated by a 2px draggable divider
with a grabber handle. The left pane is deliberately not rebuilt while the
student moves between questions sharing a passage, which is what preserves
scroll position and live highlight marks. Panes use `scrollbar-gutter: stable`
so nothing shifts when content stops overflowing. An optional 246px notes pane
docks to the right; the calculator floats and pushes the pane's left padding by
`--calcw` over `.28s cubic-bezier(.2,.7,.3,1)`.

Spacing rhythm is 6 / 10 / 14 / 22 / 26px. Panes pad `22px 26px` with 60px of
bottom slack so the last choice clears the bottom bar.

**Breakpoints:** `860px` is the one that matters, and it is shared between
`narrow.css` and `isNarrow()` in JS. Below it, tools collapse into a More menu,
a passage question becomes two flippable pages, and choices stack. `1100px`
reflows the calculator, `560px` handles the smallest phones, and the sign-in
illustration band shrinks under `620px` wide or `720px` tall.

### Named Rules

**The Pinned Column Rule.** Any grid whose children can be hidden assigns
`grid-column` explicitly. Relying on source order is how the toolbar once
migrated into the clock's empty slot.

**The Single Scroll Rule.** The shell never scrolls; exactly one region does.
`overflow:hidden` on `main`, `overflow-y:scroll` on the pane.

## Elevation & Depth

**The system is flat and drawn, not lit.** Resting surfaces have no shadow at
all. Separation is done with borders — 2px on controls, 1px hairlines between
rows — and above all with the **dashed black rule**:
`repeating-linear-gradient(to right,#1b1b1b 0 20px,transparent 20px 26px)`,
which marks the bottom of the top bar, the top of the bottom bar, and the
bottom of the question header. It is the signature graphic device of the whole
interface.

Shadow is reserved for layers that genuinely float, and it scales with how far
above the document they sit.

### Shadow Vocabulary

- **Resting card** (`0 1px 3px rgba(0,0,0,.07)`): intro and finish cards.
  Barely there; a card is a bordered surface first.
- **Anchored popover**
  (`0 6px 22px rgba(0,0,0,.26), 0 0 0 1px rgba(0,0,0,.09)`): the highlight
  toolbar. Ambient shadow plus a hairline ring so it reads on any background.
- **Menu / navigator** (`0 10px 34px rgba(0,0,0,.24)`,
  `0 14px 44px rgba(0,0,0,.26)`): the question navigator and the More menu.
- **Modal** (`0 24px 70px rgba(0,0,0,.35)`): sheets over a `rgba(0,0,0,.45)`
  scrim.
- **Selection ring** (`0 0 0 3px #1b1b1b`): the current question in the
  navigator; `0 0 0 2.5px` for a pressed highlighter swatch. A ring, not a glow.

### Named Rules

**The Drawn-Depth Rule.** If an element sits in the document flow, it gets a
border, never a shadow. Shadow is proof of floating.

**The Dashed Rule Rule.** The dashed black separator belongs to the boundary
between application chrome and exam content. Do not use it as decoration, and
do not replace it with a solid line.

## Shapes

Rectangular and squared-off, with small consistent softening. Radii cluster at
4–6px for small controls (tool tabs, chips, `kbd`, the strikethrough toggle),
8–9px for fields and choice rows, 10–12px for cards, sheets, and menus, and
16px for the sign-in card. Fully round forms are reserved for two things: the
26px choice letter disc and strike button (`50%`), and the pill buttons —
`24px` on `.btn`, `999px` on the sign-in actions.

Borders carry the weight the shadows don't: **2px is the default control
border** (choices, inputs, buttons, the pane divider), 1.5px on smaller discs
and sign-in fields, 1px for hairline dividers. Unanswered navigator squares use
a **2px dashed** border and fill solid on answer.

Two shapes are deliberately hard-edged: the black question-number block
(`.qnum`, no radius), and the banners, which are square on top and rounded
`9px` only at the bottom so they read as hanging from the bar above.

### Named Rules

**The Dashed-to-Solid Rule.** Incomplete state is a dashed outline on white;
complete state is a solid blue fill. It applies to the navigator and its
legend, and to any future progress affordance.

## Components

### Buttons

- **Shape:** pill (`24px` radius), with a 2px transparent border so ghost and
  quiet variants share the exact metrics.
- **Primary:** Sanctioned Blue, white text, 15px/700, `9px 26px`
  (`.wide` → `11px 36px`). Hover deepens to Pressed.
- **Ghost:** white with a 2px Sanctioned Blue border and blue text; hover fills
  with Blue Wash.
- **Quiet:** white with a `#9a9a9a` border and ink text; hover fills Panel Grey.
- **Gold:** Proctor Gold on Booklet Ink — the go-forward action only.
- **Disabled:** `opacity: .4`, `cursor: not-allowed`. No color change.
- **Focus:** the global `3px` Sanctioned Blue outline at `2px` offset. Never
  removed, never restyled per component.

### Choice Rows (signature component)

The most important control in the app. A `52px`-minimum row: 2px `#8e8e8e`
border, `9px` radius, white ground, serif body at `1.02em`, and a `26px`
circular letter disc on the left. Selected state moves the border to Sanctioned
Blue and fills the disc blue with white text — nothing else changes, and the
row never tints. Hover darkens the border to `#333` only. Multi-select swaps
the disc to a `5px` rounded square. Eliminated choices drop to `.45` opacity
with body and letter struck through, and reveal a `26px` strike button in the
gutter when answer-elimination mode is on.

### Inputs / Fields

- **Text and math fields:** 2px `#8e8e8e` border, `8px` radius, white, serif at
  `1.02em`, `11px 13px` padding. Focus moves the border to Sanctioned Blue and
  suppresses the default outline.
- **Fill-in-the-blank:** no box — a `2px` bottom rule on a `#fff8d8` cream
  ground, `120px` minimum, centred text. On focus the ground goes white and the
  rule turns blue. It reads as a ruled blank in a printed booklet.
- **Labels:** sans, 13px/700, Muted Ink, `+0.02em`, above the field.
- **Select:** serif, 2px border, `8px` radius, `220px` minimum width.

### Top Bar Tools

Tab-shaped buttons (`7px 7px 0 0`) with a stacked 21px icon over a 12.5px/600
label, `62px` minimum width. Hover lifts them to white with a black 2.5px
underline bar; `aria-pressed="true"` keeps the white ground and turns the
underline Sanctioned Blue. The underline is a positioned pseudo-element, not a
border, so tab metrics never shift between states.

### Question Navigator

A fixed popover anchored over its toggle with a rotated-square caret, `14px`
radius, `min(560px, 100vw - 32px)` wide, rising `26px` over
`.18s cubic-bezier(.2,.7,.3,1)`. Inside: a centred wrapping grid of `44px`
squares at `26px 20px` gaps — the generous vertical gap exists to make room for
the flag, note, and current-position markers that hang outside each square.
Unanswered squares are dashed-bordered white with underlined blue numerals;
answered are solid blue; the current one carries a `3px` black ring.

### Modals and Sheets

White, `12px` radius, `max-width: min(860px, 100%)`, `86vh` cap, over a
`rgba(0,0,0,.45)` scrim that fades in over `.18s`. The header is sticky with a
1px hairline beneath it and a `22px` close glyph at the right. Directions
sheets set `.serifed`: serif, 17px, 1.7 line-height, `900px` measure.

### Highlight Toolbar

A `26px` pill of `29px` circular swatches that appears on selection. Swatch
rules must be qualified (`.hltoolbar button.sw-y`) because the generic
`.hltoolbar button` white background outranks a bare `.sw-y` class. Pressed
state is a `2.5px` black ring with a white border.

### Banners

Full-width strips hanging under the top bar, square on top and `9px` rounded at
the bottom, 11.5px/800 uppercase at `+0.07em`: Invigilator Navy for preview
mode, Alert Wash for calculator-prohibited, Flag Crimson for time-up.

### Notes Pane

A `246px` fixed-width column, `#f4f4f4`, hairline-bordered on both sides. Each
note is a white card whose header bar is filled with the highlighter color it
belongs to, above a borderless textarea. The active card takes a black border
plus a 1px ring.

## Do's and Don'ts

### Do:

- **Do** check every new decision against the real Bluebook first. "Because
  Bluebook does it" is the only argument this system accepts, and the shipped
  code is the reference when the real app is not to hand.
- **Do** use serif (Source Serif 4) for anything the student reads to answer or
  types as an answer, and system sans for everything the application says about
  itself.
- **Do** keep the dashed black rule as the boundary between chrome and content
  (`repeating-linear-gradient(to right,#1b1b1b 0 20px,transparent 20px 26px)`).
- **Do** give controls 2px borders and oversized targets — 52px choice rows,
  44px navigator squares, 26px letter discs.
- **Do** pin `grid-column` explicitly on any bar whose children can be hidden.
- **Do** size question content in `em` under `.zoomable` so the text-size
  control scales the exam and not the chrome.
- **Do** use `font-variant-numeric: tabular-nums` on anything counting down.
- **Do** qualify swatch and state selectors with their element
  (`.hltoolbar button.sw-y`) — source order loses to specificity here.
- **Do** give any element with a base `transform` its own keyframes that carry
  that transform through (see `navRise` versus `riseIn`).

### Don't:

- **Don't** introduce a font, a palette, or a visual idea that the real Bluebook
  does not have. There is no room for authorship on the exam surface.
- **Don't** put periwinkle (`--bar`) on anything but the top and bottom bars.
- **Don't** use Sanctioned Blue for decoration. It means answered, selected,
  active, or focused, and nothing else.
- **Don't** add shadows to resting surfaces. Flat plus a border is the default;
  shadow means the element floats.
- **Don't** tint a selected choice row's background — the selection reads
  through the border and the letter disc only.
- **Don't** remove or restyle the global `3px` Sanctioned Blue focus outline.
- **Don't** inject a third-party global stylesheet into the exam document. The
  TI-84 emulator lives in its own page for exactly this reason.
- **Don't** reorder the `@import`s in `src/styles/index.css`. The order is
  load-bearing and `narrow.css` must stay last.
