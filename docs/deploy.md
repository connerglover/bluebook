# Deploying to Cloudflare Pages

The app is fully static. `npm run build` writes `dist/`, and `dist/` is the
entire deployment — no Worker, no Function, no database, no server-side state.

## One-time setup

In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to
Git**, pick this repository, then set:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or newer |

That is all of it. Every push to the default branch redeploys; pushes to other
branches get a preview URL.

If the project is named something other than `bluebook`, change `name` in
`wrangler.toml` to match. That file is only read by the `wrangler` CLI — the
dashboard build settings above are what actually govern a Git-connected
deployment.

## What ships

```
dist/
  index.html          sign-in + exam
  author.html         answer-key builder
  ti84.html           the TI-84 emulator's own page
  assets/…            hashed JS, CSS and KaTeX fonts
  _headers            security headers and cache rules
  _redirects          /author → /author.html
  robots.txt          disallow all
```

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
