/* Reading a .bbtest off disk.

   The only way a test enters the app: a file the person picks or drags in.
   Nothing is fetched, so the app works with no network once it is cached. */

import { validateTest } from "./validate.js";

/** 8 MB. A test with several embedded photographs, and no more. */
export const MAX_BYTES = 8 * 1024 * 1024;

export class LoadError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = "LoadError";
    this.detail = detail || null;
  }
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new LoadError("No file was chosen.")); return; }
    if (file.size > MAX_BYTES) {
      reject(new LoadError("That file is " + Math.round(file.size / 1048576) +
        " MB, larger than the 8 MB limit."));
      return;
    }
    const r = new FileReader();
    r.onerror = () => reject(new LoadError("The file could not be read."));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsText(file);
  });
}

export function parseTest(text, fileName) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Point at the line, because a hand-edited test usually breaks in one spot.
    const m = /position (\d+)/.exec(e.message || "");
    let where = "";
    if (m) {
      const upto = text.slice(0, parseInt(m[1], 10));
      where = " (around line " + (upto.split("\n").length) + ")";
    }
    throw new LoadError("That file is not valid JSON" + where + ".", e.message);
  }

  const report = validateTest(data);
  if (!report.ok) {
    throw new LoadError(
      "That test file has " + report.errors.length + " problem" +
      (report.errors.length === 1 ? "" : "s") + " that stop it loading.",
      report.errors.join("\n"));
  }
  return { data, report, fileName: fileName || "" };
}

export async function loadFromFile(file) {
  const text = await readFile(file);
  return parseTest(text, file.name);
}

/** True when a drag event is carrying something that could be a test file. */
export function looksLikeTestDrag(e) {
  const dt = e.dataTransfer;
  if (!dt) return false;
  if (dt.items && dt.items.length) {
    return Array.prototype.some.call(dt.items, (it) => it.kind === "file");
  }
  return !!(dt.types && Array.prototype.indexOf.call(dt.types, "Files") >= 0);
}
