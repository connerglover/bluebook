/* The sign-in screen.

   Stands in for the ticket flow in the real app: a name, and the test file.
   Neither is a credential — nothing here authenticates anything, and no
   password or account is ever asked for. */

import { $, esc } from "../core/dom.js";
import { LoadError, loadFromFile, looksLikeTestDrag, parseTest } from "../loader/load.js";
import { describeSnapshot, load as loadSnapshot, clear as clearSnapshot, saveName, savedName } from "../persist/store.js";

const ui = {};

function cache() {
  ["signin", "siName", "siNameErr", "siPick", "siFile", "siFileErr", "siDrop",
    "siResume", "siResumeBtn", "siResumeLabel", "siResumeSub", "siDiscard",
    "siForm"].forEach((k) => { ui[k] = $(k); });
}

function showFileError(err) {
  const box = ui.siFileErr;
  box.hidden = false;
  box.innerHTML = "<strong>" + esc(err.message) + "</strong>" +
    (err.detail ? '<span class="si-detail">' + esc(err.detail) + "</span>" : "");
}

function clearFileError() {
  ui.siFileErr.hidden = true;
  ui.siFileErr.textContent = "";
}

function requireName() {
  const v = ui.siName.value.trim();
  ui.siNameErr.hidden = !!v;
  if (!v) ui.siName.focus();
  return v;
}

/**
 * Wire the screen up.
 * `onStart({ data, fileName, name, resume })` runs when a test is ready.
 */
export function initSignin(onStart) {
  cache();

  ui.siName.value = savedName();

  const snap = loadSnapshot();
  if (snap) {
    ui.siResume.hidden = false;
    ui.siResumeLabel.textContent = "Resume " + (snap.title || "your test");
    ui.siResumeSub.textContent = describeSnapshot(snap);
    if (!ui.siName.value && snap.testerName) ui.siName.value = snap.testerName;
  }

  ui.siForm.addEventListener("submit", (e) => e.preventDefault());
  ui.siName.addEventListener("input", () => { ui.siNameErr.hidden = true; });

  ui.siPick.addEventListener("click", () => {
    if (!requireName()) return;
    clearFileError();
    ui.siFile.click();
  });

  ui.siFile.addEventListener("change", async () => {
    const file = ui.siFile.files && ui.siFile.files[0];
    ui.siFile.value = "";                       // allow re-picking the same file
    if (!file) return;
    await accept(file);
  });

  async function accept(file) {
    const name = requireName();
    if (!name) return;
    clearFileError();
    try {
      const loaded = await loadFromFile(file);
      saveName(name);
      onStart({
        data: loaded.data,
        fileName: loaded.fileName,
        report: loaded.report,
        name,
        resume: null,
      });
    } catch (err) {
      if (err instanceof LoadError) showFileError(err);
      else showFileError(new LoadError("That file could not be loaded.", err.message));
    }
  }

  /* Drag and drop anywhere on the page. */
  let dragDepth = 0;
  const setDrag = (on) => ui.signin.classList.toggle("dragging", on);
  window.addEventListener("dragenter", (e) => {
    if (!looksLikeTestDrag(e)) return;
    e.preventDefault();
    dragDepth += 1;
    setDrag(true);
  });
  window.addEventListener("dragover", (e) => {
    if (looksLikeTestDrag(e)) e.preventDefault();
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) setDrag(false);
  });
  window.addEventListener("drop", async (e) => {
    if (!looksLikeTestDrag(e)) return;
    e.preventDefault();
    dragDepth = 0;
    setDrag(false);
    if (ui.signin.hidden) return;                // exam already running
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) await accept(file);
  });

  if (snap) {
    ui.siResumeBtn.addEventListener("click", () => {
      const name = ui.siName.value.trim() || snap.testerName || "Tester";
      saveName(name);
      let parsed;
      try {
        parsed = parseTest(JSON.stringify(snap.test), snap.fileName);
      } catch (err) {
        showFileError(new LoadError(
          "The saved test could not be reopened. Load the file again.", err.detail || err.message));
        clearSnapshot();
        ui.siResume.hidden = true;
        return;
      }
      onStart({
        data: parsed.data,
        fileName: snap.fileName,
        report: parsed.report,
        name,
        resume: snap,
      });
    });

    ui.siDiscard.addEventListener("click", () => {
      clearSnapshot();
      ui.siResume.hidden = true;
    });
  }

}

export function hideSignin() {
  if (ui.signin) ui.signin.hidden = true;
  document.body.classList.remove("on-signin");
}
