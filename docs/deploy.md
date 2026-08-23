# Deploying to Cloudflare

The app is fully static. `npm run build` writes `dist/`, and `dist/` is the
entire deployment — no Worker code, no Function, no database, no server-side
state.

Cloudflare has two products that both do this, and they need different config.
**Pick one and make the dashboard and `wrangler.toml` agree**, because the
failure mode when they disagree is a green build followed by a deploy that
errors with `Missing entry-point to Worker script or to assets directory`.

## Which one am I on?

Look at a build log. If it contains a line like:

```
Executing user deploy command: npx wrangler deploy
```

you are on **Workers Builds** (option A). Classic Pages Git builds have no
deploy command at all — they just copy the build output directory.

---

## Option A — Workers with static assets (what this repo is set up for)

`wrangler.toml` declares an `[assets]` block, and the build's deploy command
runs `npx wrangler deploy`. Nothing else is needed.

Dashboard settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | 20 or newer |

Check it locally before pushing — this runs everything the build server does
except the upload:

```bash
npm run build && npx wrangler deploy --dry-run
```

A healthy run ends with `Read N files from the assets directory`. If it says
`Missing entry-point`, `wrangler.toml` has Pages config in it (see below).

---

## Option B — classic Pages

Then `wrangler.toml` needs the Pages key instead of the `[assets]` block:

```toml
name = "bluebook"
compatibility_date = "2026-08-22"
pages_build_output_dir = "dist"
```

Delete the `[assets]`, `html_handling` and `not_found_handling` lines — Pages
does not read them.

Dashboard settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Deploy command | **empty** — leave it blank |

The deploy command is the part that catches people. A Pages project with
`npx wrangler deploy` set will fail every time, because that is the Workers
command.

---

## What ships

```
dist/
  index.html          sign-in + exam
  author.html         answer-key builder
  ti84.html           the TI-84 emulator's own page
  404.html            shown for any other path
  assets/…            hashed JS, CSS and KaTeX fonts
  favicon.svg         }
  favicon.ico         }  regenerate with: python tools/make-favicon.py
  apple-touch-icon.png}
  icon-192.png        }
  icon-512.png        }
  site.webmanifest    }
  signin-art.svg      the sign-in screen's illustration band
  _headers            security headers and cache rules
  _redirects          intentionally empty — see the file
  robots.txt          disallow all
```

`_headers` and `_redirects` are honoured by both products.

## Headers

`public/_headers` sets a Content-Security-Policy, `nosniff`, a referrer policy,
and cache rules. Two things about it are deliberate:

**The exam page runs `script-src 'self'`.** A `.bbtest` is untrusted input — it
arrives as a file the student picked off their own disk and gets rendered into
the app's own origin. `src/render/figure.js` scrubs author-supplied SVG, and the
CSP is the second line of defence behind it.

**`/ti84.html` gets its own, looser policy.** The TI-84 emulator loads Texas
Instruments' engine and TestNav's stylesheet from `mn.testnav.com` and runs an
inline bootstrap. It lives on a separate page precisely so that policy does not
have to apply to the exam. It used to be an `<iframe srcdoc>`, which inherits
the *parent's* CSP — under `script-src 'self'` the calculator would have died
silently.

`style-src` allows `'unsafe-inline'` because the runtime sets inline styles for
the line reader, the split pane, and the draggable calculator. Removing that
would mean rewriting all three to use CSS custom properties.

**Headers only apply on Cloudflare.** `npm run preview` serves `dist/` without
them, so a CSP mistake will not show up locally. Check the deployed site's
response headers, and the browser console, after the first deploy.

## Offline

Once loaded, the app needs no network: the test file comes off disk and the
results file is saved back to it. Two exceptions, both non-fatal:

- **Google Fonts** supplies the serif face. Without it the app falls back to
  Georgia and looks slightly different.
- **The TI-84** needs `mn.testnav.com` on first load. When it cannot start, the
  panel offers the hosted popup build and the built-in calculator instead.

## Running it locally

```bash
npm install
npm run dev
```

```bash
npm run build && npm run preview
```

```bash
bash test/run.sh
```

## A note on the sign-in screen

The landing page deliberately imitates College Board's Bluebook sign-in so the
practice run feels like the real thing. It asks for a name — not a credential —
and carries an "unofficial, not affiliated with College Board" line in the
footer. Keep that disclaimer if you put the site on a public domain.
