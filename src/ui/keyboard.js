/* Keyboard shortcuts, matching the exam app's set. */

import { $ } from "../core/dom.js";
import { curSec, el, state } from "../core/state.js";
import { toggleClockVisible } from "../core/clock.js";
import { closeAsk, closeSheet, openBBSheet } from "./dialogs.js";
import { closeNav, openNav } from "./nav.js";
import { hasReference, setRef, setZoom } from "./toolbar.js";
import { hideDelete, hideHlBar, openHlList } from "./highlight.js";
import { setReader } from "./reader.js";
import { drawQuestion, goNext, goPrev } from "./question.js";
import { setCalc, setTI, tiState } from "../calc/panel.js";

const SHORTCUTS = [
  ["Open/close this list", "F1"],
  ["Back", "Ctrl + Alt + B"],
  ["Next", "Ctrl + Alt + X"],
  ["Open/close question menu", "Ctrl + Alt + G"],
  ["Open/close directions", "Ctrl + Alt + Shift + D"],
  ["Hide/show timer", "Ctrl + Alt + T"],
  ["Mark for review", "Ctrl + Alt + V"],
  ["Highlights &amp; notes", "Ctrl + H"],
  ["Open/close line reader", "Ctrl + L"],
  ["Open/close calculator", "Ctrl + Alt + C"],
  ["Open/close reference", "Ctrl + Alt + R"],
  ["Select answer A–E", "Ctrl + Shift + 1…5"],
  ["Option eliminator mode", "Ctrl + Alt + O"],
  ["Cross out choice A–E", "Ctrl + Alt + 1…5"],
  ["Zoom in / out / reset", "Ctrl + Plus / Minus / 0"],
];

export function openKbd() {
  openBBSheet("Keyboard Shortcuts", [
    ["Keyboard Shortcuts: Windows and Mac",
      "<p>On a Mac, use Command in place of Control. If a shortcut includes a function key you may need to hold Fn.</p>" +
      "<table>" + SHORTCUTS.map((r) =>
        "<tr><td>" + r[0] + "</td><td><kbd>" + r[1].replace(/ \+ /g, "</kbd> + <kbd>") + "</kbd></td></tr>"
      ).join("") + "</table>"],
  ]);
}

export function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeNav(); hideHlBar(); hideDelete();
      [el.dirScrim, el.kbdScrim, el.hlScrim].forEach(closeSheet);
      setRef(false);
      if (!el.askScrim.hidden) closeAsk(false);
      return;
    }
    if (e.key === "F1") {
      e.preventDefault();
      if (el.kbdScrim.hidden) openKbd(); else closeSheet(el.kbdScrim);
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const inField = e.target && (
      e.target.matches("input,textarea,select,[contenteditable=true]") ||
      e.target.tagName === "MATH-FIELD");

    if (e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); if (state.screen === "question") goPrev(); return; }
      if (k === "x") { e.preventDefault(); if (state.screen === "question") goNext(); return; }
      if (k === "g") {
        e.preventDefault();
        if (state.screen === "question") { if (el.navpop.hidden) openNav(); else closeNav(); }
        return;
      }
      if (k === "t") { e.preventDefault(); toggleClockVisible(); return; }
      if (k === "v") { e.preventDefault(); const b = $("markBtn"); if (b) b.click(); return; }
      if (k === "c") {
        e.preventDefault();
        if (curSec() && curSec().calculator) {
          if (tiState.available) setTI(el.tiShell.hidden); else setCalc(el.calc.hidden);
        }
        return;
      }
      if (k === "r") { e.preventDefault(); if (hasReference()) setRef(el.refPanel.hidden); return; }
      if (k === "o") {
        e.preventDefault();
        state.elim = !state.elim;
        if (state.screen === "question") drawQuestion();
        return;
      }
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const b = document.querySelector('[data-strike="' + (parseInt(e.key, 10) - 1) + '"]');
        if (b) b.click();
        return;
      }
    }
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      el.dirBtn.click();
      return;
    }
    if (e.shiftKey && !e.altKey && /^[1-5!@#$%]$/.test(e.key)) {
      const map = { "!": 1, "@": 2, "#": 3, $: 4, "%": 5 };
      const n = map[e.key] || parseInt(e.key, 10);
      if (n) {
        const b = document.querySelector('[data-pick="' + (n - 1) + '"]');
        if (b) { e.preventDefault(); b.click(); }
      }
      return;
    }
    if (!e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "h" && !inField) { e.preventDefault(); openHlList(); return; }
      if (k === "l" && !inField) { e.preventDefault(); setReader(!state.reader.on); return; }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(state.zoom + 0.1); return; }
      if (e.key === "-") { e.preventDefault(); setZoom(state.zoom - 0.1); return; }
      if (e.key === "0") { e.preventDefault(); setZoom(1); }
    }
  });
}
