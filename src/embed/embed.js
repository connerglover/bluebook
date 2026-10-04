/* Embed mode.

   The standalone app loads a file the tester picks and saves a results file
   they carry away by hand. A host page that already has the test, and wants
   the result back, can instead frame the app with:

     ?embed=1&src=<test url>&submit=<result url>&attempt=<id>
       [&name=<tester>][&theme=<stylesheet url>][&tab=<a-g>]

   The app then skips the sign-in screen, fetches the test from `src`, keys
   saved progress by `attempt` so several sittings can coexist, and POSTs the
   result to `submit` instead of downloading it. Nothing here knows who the
   host is.

   Every URL must be same-origin. A crafted link must not be able to send
   someone's answers to a third party, or style the exam from one. */

const ATTEMPT_RE = /^[A-Za-z0-9._-]{1,80}$/;

function sameOrigin(raw, base) {
  if (!raw) return null;
  try {
    const here = new URL(base);
    const u = new URL(raw, here.href);
    return u.origin === here.origin ? u.href : null;
  } catch (e) {
    return null;
  }
}

/** Parse embed settings out of a page URL. Exported for the tests. */
export function readEmbed(href) {
  let q;
  try { q = new URL(href).searchParams; } catch (e) { return null; }
  if (q.get("embed") !== "1") return null;
  const src = sameOrigin(q.get("src"), href);
  const submit = sameOrigin(q.get("submit"), href);
  const attempt = q.get("attempt") || "";
  if (!src || !submit || !ATTEMPT_RE.test(attempt)) {
    return { broken: true };
  }
  return {
    broken: false,
    src,
    submit,
    attempt,
    name: (q.get("name") || "").trim().slice(0, 60),
    theme: sameOrigin(q.get("theme"), href),
    tab: /^[a-gx]$/.test(q.get("tab") || "") ? q.get("tab") : null,
  };
}

/** The embed settings, or null in the standalone app. Read once. */
export const EMBED = readEmbed(window.location.href);

export function isEmbedded() {
  return !!(EMBED && !EMBED.broken);
}

/** Load the host's theme as the last stylesheet, so it only has to override tokens. */
export function applyTheme() {
  if (!isEmbedded()) return;
  document.documentElement.classList.add("embedded");
  if (EMBED.tab) document.documentElement.setAttribute("data-tab", EMBED.tab);
  if (!EMBED.theme) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = EMBED.theme;
  document.head.appendChild(link);
}

/** Fetch the test text from the host. Throws with a sentence a person can act on. */
export async function fetchTest() {
  let res;
  try {
    res = await fetch(EMBED.src, { credentials: "same-origin", cache: "no-store" });
  } catch (e) {
    throw new Error("The test could not be reached. Check your connection and reload.");
  }
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).error || ""; } catch (e) { /* not JSON */ }
    throw new Error(msg || "The test could not be loaded (" + res.status + ").");
  }
  return res.text();
}

const PENDING = (a) => "bluebook:embed:pending:" + a;

function stash(attempt, body) {
  try { window.localStorage.setItem(PENDING(attempt), body); } catch (e) { /* nothing to do */ }
}
function unstash(attempt) {
  try { window.localStorage.removeItem(PENDING(attempt)); } catch (e) { /* nothing to do */ }
}

/**
 * POST the result to the host, retrying a few times with backoff. The body is
 * stashed first, so a closed tab or a dead network loses nothing: the next
 * load of the same attempt sends it again (see resendPending).
 * Resolves to the host's JSON reply.
 */
export async function submitResult(payload) {
  const body = JSON.stringify(payload);
  stash(EMBED.attempt, body);
  const waits = [0, 1500, 4000, 9000];
  let last = null;
  for (let i = 0; i < waits.length; i += 1) {
    if (waits[i]) await new Promise((r) => setTimeout(r, waits[i]));
    try {
      const res = await fetch(EMBED.submit, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body,
      });
      let reply = {};
      try { reply = await res.json(); } catch (e) { /* empty reply */ }
      if (res.ok) {
        unstash(EMBED.attempt);
        return reply;
      }
      last = new Error(reply.error || "The result was not accepted (" + res.status + ").");
      // A 4xx will not get better by asking again.
      if (res.status >= 400 && res.status < 500) break;
    } catch (e) {
      last = new Error("The result could not be sent. It is saved in this browser and will be sent again.");
    }
  }
  throw last;
}

/** A result that never reached the host, from an earlier visit. */
export function pendingResult() {
  if (!isEmbedded()) return null;
  try { return window.localStorage.getItem(PENDING(EMBED.attempt)); } catch (e) { return null; }
}

/** Tell the framing page, if any, that the attempt is in. */
export function notifyHost(message) {
  if (window.parent === window) return;
  try { window.parent.postMessage(message, window.location.origin); } catch (e) { /* no host */ }
}
