/* TI-84 Plus CE.

   Loads Texas Instruments' own HTML5 emulator at runtime, the way
   ading2210/ti84pce-html5 does. Nothing proprietary ships in this repo.

   The engine and TestNav's tn.css run inside their own document. Injecting
   tn.css into this page restyled the whole app: top-bar tools vanished, the
   page grew taller, and controls took on TestNav's look. An isolated frame
   contains it. Never inject a foreign application stylesheet into this
   document.

   That frame is public/ti84.html — a real page, loaded by src. It used to be
   an <iframe srcdoc>, which works until the app has a CSP: a srcdoc frame
   inherits the parent's policy, so `script-src 'self'` would block TI's engine
   and the calculator would fail with no obvious cause. A separate page carries
   its own policy from _headers and leaves the exam page's CSP strict.

   The emulator needs a network connection. When it cannot start, the panel
   offers the hosted popup build and the built-in calculator instead. */

import { $, esc } from "../core/dom.js";
import { el } from "../core/state.js";

export const TI_CONFIG = {
  enabled: true,
  /* A real page, not an <iframe srcdoc>. A srcdoc frame inherits the parent
     document's CSP, so under the app's own policy the emulator's third-party
     script would be blocked and the calculator would die silently. public/
     ti84.html gets its own, looser policy from _headers instead. */
  page: ((import.meta.env && import.meta.env.BASE_URL) || "/") + "ti84.html",
  timeoutMs: 9000,
};

export const tiState = { built: false, placed: false, available: TI_CONFIG.enabled };

let tiSize = { w: 320, h: 720 };

/* ading2210/ti84pce-html5 ships an open_popup() that hands the calculator its
   own browser window. Pointed at the hosted build it sidesteps every CORS
   problem, so it is a fallback rather than a lesser calculator. */
const TI_POPUP = "https://ti84.pages.dev/";

export function openTIPopup() {
  const u = new URL(TI_POPUP);
  u.hash = "popup";
  const win = window.open(u.href, "ti84calc",
    "width=" + Math.round(tiSize.w) + ",height=" + Math.round(tiSize.h));
  if (win && win.focus) win.focus();
  return win;
}

/* Set by main.js so a failure can rebuild the tool strip without this module
   importing the toolbar (which imports this one). */
const hooks = { onFallback: null };
export function setTiHooks(h) { Object.assign(hooks, h); }

function tiFailed(why) {
  tiState.built = false;
  tiState.available = false;
  el.tiShell.style.width = "";
  el.tiBody.innerHTML =
    '<div class="ti-msg"><strong>The TI-84 could not start.</strong><br>' + esc(why) +
    "<br><br>This needs a network connection the first time it runs." +
    '<br><button class="btn" type="button" id="tiPopOut">Open it in a separate window</button>' +
    '<button class="linkbtn" type="button" id="tiUseBuiltIn" style="display:block;margin:10px auto 0;color:#8d94a1">Use the built-in calculator instead</button></div>';
  const pop = $("tiPopOut");
  if (pop) pop.addEventListener("click", openTIPopup);
  const b = $("tiUseBuiltIn");
  if (b) b.addEventListener("click", () => { if (hooks.onFallback) hooks.onFallback(); });
}

function buildTI() {
  if (tiState.built) return;
  tiState.built = true;
  const f = document.createElement("iframe");
  f.setAttribute("title", "TI-84 Plus CE");
  f.width = "300";
  f.height = "700";
  f.src = TI_CONFIG.page;

  let settled = false;
  const guard = setTimeout(() => {
    if (!settled) { settled = true; tiFailed("timed out reaching mn.testnav.com"); }
  }, TI_CONFIG.timeoutMs);

  function onMsg(e) {
    const d = e && e.data;
    if (!d || !d.ti || e.source !== f.contentWindow) return;
    settled = true;
    clearTimeout(guard);
    window.removeEventListener("message", onMsg);
    if (d.ti === "ok") {
      f.width = String(Math.ceil(d.w));
      f.height = String(Math.ceil(d.h));
      el.tiShell.style.width = Math.ceil(d.w) + "px";
      tiSize = { w: Math.ceil(d.w) + 16, h: Math.ceil(d.h) + 40 };
    } else {
      tiFailed(d.why || "the emulator could not start");
    }
  }
  window.addEventListener("message", onMsg);
  el.tiBody.innerHTML = "";
  el.tiBody.appendChild(f);
}

export function setTI(open) {
  el.tiShell.hidden = !open;
  if (!open) return;
  if (!tiState.placed) {
    tiState.placed = true;
    el.tiShell.style.top = "92px";
    el.tiShell.style.left = Math.max(8, window.innerWidth - 360) + "px";
  }
  buildTI();
}

export function wireTI() {
  el.tiClose.addEventListener("click", () => setTI(false));
  el.tiPopup.addEventListener("click", (e) => { e.stopPropagation(); openTIPopup(); });

  let on = false, dx = 0, dy = 0;
  el.tiGrip.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const r = el.tiShell.getBoundingClientRect();
    el.tiShell.style.left = r.left + "px";
    el.tiShell.style.top = r.top + "px";
    on = true;
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    el.tiShell.classList.add("dragging");
    el.tiGrip.setPointerCapture(e.pointerId);
  });
  el.tiGrip.addEventListener("pointermove", (e) => {
    if (!on) return;
    el.tiShell.style.left = Math.min(Math.max(-el.tiShell.offsetWidth + 70, e.clientX - dx), window.innerWidth - 70) + "px";
    el.tiShell.style.top = Math.min(Math.max(0, e.clientY - dy), window.innerHeight - 40) + "px";
  });
  const stop = (e) => {
    on = false;
    el.tiShell.classList.remove("dragging");
    try { el.tiGrip.releasePointerCapture(e.pointerId); } catch (x) { /* released */ }
  };
  el.tiGrip.addEventListener("pointerup", stop);
  el.tiGrip.addEventListener("pointercancel", stop);
}
