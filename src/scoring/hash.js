/* Answer-key hashing.

   WHAT THIS IS: the .bbtest carries a hash of each correct answer instead of
   the answer itself, so a student who opens the file in a text editor or in
   devtools does not simply read the key off it.

   WHAT THIS IS NOT: security. The salt has to travel with the file, because the
   browser needs it to verify. With five choices per question, anyone willing to
   write a five-iteration loop recovers the whole key. This raises the bar past
   a casual glance and no further, and the docs say so plainly. If a key must
   genuinely stay secret, it cannot be in the browser at all.

   Every scorable answer normalizes to a letter-based canonical string before
   hashing, which removes case, whitespace and option-wording from the picture
   entirely — the app and the key builder cannot disagree about "1/2" versus
   "0.5" because neither ever hashes free text. */

const LETTER = (i) => String.fromCharCode(65 + i);

export const SCORABLE_TYPES = ["mcq", "truefalse", "multi", "dropdown", "matching"];

export function isScorable(type) {
  return SCORABLE_TYPES.indexOf(type) >= 0;
}

/**
 * Reduce a stored answer to the canonical string that gets hashed.
 * Returns null when the question is unanswered or the type is not scorable.
 */
export function canonical(type, value, def) {
  if (value == null) return null;
  switch (type) {
    case "mcq":
    case "truefalse":
    case "dropdown":
      return typeof value === "number" ? LETTER(value) : null;
    case "multi": {
      if (!Array.isArray(value) || !value.length) return null;
      return value.slice().sort((a, b) => a - b).map(LETTER).join(",");
    }
    case "matching": {
      const n = ((def && def.left) || []).length;
      if (!n || typeof value !== "object") return null;
      const out = [];
      for (let i = 0; i < n; i += 1) {
        if (typeof value[i] !== "number") return null;   // incomplete, not gradeable
        out.push((i + 1) + "-" + LETTER(value[i]));
      }
      return out.join(",");
    }
    default:
      return null;
  }
}

/**
 * Parse an author's plaintext answer into the same canonical form.
 * Accepts "B", "b", "A,C", "A C", "1-A, 2-C". Returns null if unparseable.
 */
export function canonicalFromPlain(type, plain) {
  const s = String(plain == null ? "" : plain).trim();
  if (!s) return null;
  const letters = (t) => t.toUpperCase().replace(/[^A-Z]/g, "");
  switch (type) {
    case "mcq":
    case "truefalse":
    case "dropdown": {
      const L = letters(s);
      return L.length === 1 ? L : null;
    }
    case "multi": {
      const L = letters(s).split("");
      if (!L.length) return null;
      const uniq = Array.from(new Set(L)).sort();
      return uniq.join(",");
    }
    case "matching": {
      const pairs = s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
      const out = [];
      for (let i = 0; i < pairs.length; i += 1) {
        const m = /^(\d+)\s*(?:->|-|:|=)?\s*([A-Za-z])$/.exec(pairs[i]);
        if (!m) return null;
        out.push([parseInt(m[1], 10), m[2].toUpperCase()]);
      }
      if (!out.length) return null;
      out.sort((a, b) => a[0] - b[0]);
      return out.map((p) => p[0] + "-" + p[1]).join(",");
    }
    default:
      return null;
  }
}

function toHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf),
    (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 of `salt:questionId:canonical`, hex encoded. */
export async function hashAnswer(salt, questionId, canonicalAnswer) {
  const input = String(salt) + ":" + String(questionId) + ":" + String(canonicalAnswer);
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

/** A fresh 16-byte salt as hex, for the key builder. */
export function newSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return toHex(b.buffer);
}
