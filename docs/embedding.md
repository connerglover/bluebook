# Embedding

A host page can frame the app and hand tests in and results out without the person carrying files. Nothing in this mode knows who the host is. The standalone site behaves exactly as before.

## The link

```
index.html?embed=1&src=<test url>&submit=<result url>&attempt=<id>
          [&name=<tester>][&theme=<stylesheet url>][&tab=<a-g|x>]
```

| Parameter | Meaning |
|---|---|
| `src` | Where to `GET` the `.bbtest`. |
| `submit` | Where to `POST` the result when the test is finished. |
| `attempt` | `[A-Za-z0-9._-]{1,80}`. Saved progress is keyed by it (`bluebook:embed:<attempt>`), so several sittings can coexist. |
| `name` | The tester's name. The sign-in screen is skipped. |
| `theme` | A stylesheet loaded last, which sets the tokens below. |
| `tab` | Written to `<html data-tab>` for the theme to use. |

`src`, `submit` and `theme` must be same-origin. If `src` or `submit` is off-origin, or `attempt` is malformed, the app refuses to load. An off-origin `theme` is dropped. Build with `BB_BASE=/your/path/` to serve the app under a subpath.

## The hand-off

Finishing the test submits it. The app `POST`s:

```json
{ "attempt": "…", "result": { …the .bbresult.json… }, "answers": { "q1": "B", "q2": "A,C" } }
```

`answers` holds the canonical letters of every answered fixed-choice question, so the host can score against a key the browser never sees. A test served in embed mode may therefore carry no `key` block at all.

The host replies with JSON. An optional `visibleScore` (the shape of `visibleScore()` in `src/scoring/score.js`) is shown on the finish screen, and an optional `resultsHref` becomes a "See results" link. Failed POSTs are retried with backoff. A 4xx response is not retried. Until the POST succeeds, the body stays in localStorage and is sent again on the next visit.

The app `postMessage`s `{ type: "bb:ready" }` and `{ type: "bb:submitted", reply }` to its parent, at the app's own origin.

## Theme tokens

Every colour, radius, shadow and heading face in `src/styles` is drawn through a token whose fallback is the standalone look. The tokens are `var(--bb-role, <original>)` plus the older `--ink`, `--blue`, `--bar`, `--navy`, `--panel`, `--line`, `--flag`, `--note`, `--sans` and `--serif` in `base.css`. Bluebook never defines `--bb-*` itself; a host theme does.

| Token | Role |
|---|---|
| `--bb-surface` | Things laid on the page: cards, choices, fields, popovers |
| `--bb-fill` | Sunk fills: the question header, panes, previews |
| `--bb-hover` | Hover fills |
| `--bb-line` | Light dividers |
| `--bb-edge`, `--bb-edge-hover` | Control borders |
| `--bb-bar-rule` | The rule under the top bar, over the bottom bar and under the question header (a dashed gradient by default) |
| `--bb-ink`, `--bb-ink-2`, `--bb-ink-3` | Text, from strongest to faintest |
| `--bb-strong`, `--bb-on-strong` | Solid dark marks (the question number, the navigator button) and the text on them |
| `--bb-dark`, `--bb-dark-raised` | Dark chrome: the reference head, the line reader, the delete popover |
| `--bb-scrim` | The backdrop behind dialogs |
| `--bb-gold`, `--bb-gold-ink`, `--bb-gold-edge`, `--bb-gold-hover` | The primary yellow button |
| `--bb-r-box`, `--bb-r-pill` | Box and pill corner radii |
| `--bb-shadow-rest`, `--bb-shadow-float` | Resting and floating shadows |
| `--bb-display` | The face for titles |
| `--bb-calc-*` | The calculator: `bg`, `bar`, `key`, `key-hover`, `num`, `ink`, `ink-2`, `ink-3`, `field`, `line`, `focus`, `op`, `2nd`, `clr`, `eq` |

Highlighter colours, the LCD green and the line reader's shade are fixed on purpose.
