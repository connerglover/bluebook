/* Shared render flags.

   `bare` is true while rendering inside a field group: a `fields` block already
   carries one "saved automatically" note above the whole set, so the individual
   inputs inside it must not each print their own. It lives in its own module so
   the renderers and the registry can both read it without importing each other.

   Every free-response box carries the same note and the same placeholder. */

export const mode = { bare: false };

export const SAVE_NOTE = "Your response is saved automatically.";
export const PLACEHOLDER = "Type your response";

/** Wrap an input in the autosave note, unless we are inside a field group. */
export function withNote(inner) {
  if (mode.bare) return inner;
  const box = document.createElement("div");
  const n = document.createElement("p");
  n.className = "autosave";
  n.textContent = SAVE_NOTE;
  box.appendChild(n);
  box.appendChild(inner);
  return box;
}

/** Prepend the autosave note to an existing container. */
export function noteInto(box) {
  if (mode.bare) return box;
  const n = document.createElement("p");
  n.className = "autosave";
  n.textContent = SAVE_NOTE;
  box.appendChild(n);
  return box;
}
