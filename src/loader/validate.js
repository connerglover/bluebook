/* Validating a .bbtest before the runtime touches it.

   The old build script checked these before writing a file. Now that tests are
   loaded at runtime the app has to check them itself, because the failure mode
   otherwise is a blank white page with an exception in a console nobody opens.

   Errors block loading. Warnings are shown but let the test run — a slightly
   malformed question is better than no test at all when someone is sitting
   down to work. */

const QUESTION_TYPES = [
  "mcq", "multi", "truefalse", "dropdown", "matching",
  "fill", "short", "essay", "math", "parts", "fields",
];

const CHOICE_TYPES = ["mcq", "multi"];

/* JSON silently accepts \f, \b, \t and \r. "$\frac{1}{2}$" with ONE backslash
   parses fine and yields a formfeed followed by "rac{1}{2}" — no error
   anywhere, the LaTeX just disappears. This is the single most common way a
   generated test breaks, so it is checked by name. */
const LATEX_TRAP = /[\f\b\v]/;

function walkStrings(value, path, visit) {
  if (typeof value === "string") { visit(value, path); return; }
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, path + "[" + i + "]", visit));
    return;
  }
  if (value && typeof value === "object") {
    Object.keys(value).forEach((k) => walkStrings(value[k], path ? path + "." + k : k, visit));
  }
}

function countDelimiters(s) {
  // Count $ that are not escaped as \$. $$ pairs are counted as two.
  let n = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "$" && (i === 0 || s[i - 1] !== "\\")) n += 1;
  }
  return n;
}

export function validateTest(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, errors: ["The file is not a test object."], warnings };
  }

  const meta = data.meta || {};
  if (!meta.title) warnings.push("meta.title is missing; the test will be called “Practice Test”.");
  if (meta.scoreReveal && ["none", "total", "detailed"].indexOf(String(meta.scoreReveal)) < 0) {
    warnings.push('meta.scoreReveal must be "none", "total" or "detailed"; treating it as "none".');
  }

  const sections = data.sections;
  if (!Array.isArray(sections) || !sections.length) {
    errors.push("The file has no sections.");
    return { ok: false, errors, warnings };
  }

  const seenIds = Object.create(null);
  let questionCount = 0;

  sections.forEach((sec, si) => {
    const where = "sections[" + si + "]";
    if (!sec || typeof sec !== "object") { errors.push(where + " is not an object."); return; }
    if (!sec.name) warnings.push(where + " has no name.");
    if (!Array.isArray(sec.questions)) {
      errors.push(where + ".questions must be an array.");
      return;
    }

    const passageIds = Object.create(null);
    (sec.passages || []).forEach((p, pi) => {
      const pw = where + ".passages[" + pi + "]";
      if (!p || typeof p !== "object") { errors.push(pw + " is not an object."); return; }
      if (!p.text && !p.html) warnings.push(pw + " has no text.");
      const id = p.id || ("p" + (si + 1) + "-" + (pi + 1));
      if (passageIds[id]) errors.push("Duplicate passage id “" + id + "”.");
      passageIds[id] = true;
    });

    sec.questions.forEach((q, qi) => {
      const qw = where + ".questions[" + qi + "]";
      questionCount += 1;
      if (!q || typeof q !== "object") { errors.push(qw + " is not an object."); return; }

      const type = q.type || "mcq";
      if (QUESTION_TYPES.indexOf(type) < 0) {
        errors.push(qw + ' has unknown type "' + type + '".');
      }
      if (q.id) {
        if (seenIds[q.id]) errors.push("Duplicate question id “" + q.id + "”.");
        seenIds[q.id] = true;
      }
      if (CHOICE_TYPES.indexOf(type) >= 0) {
        if (!Array.isArray(q.choices) || q.choices.length < 2) {
          errors.push(qw + " is " + type + " but has fewer than two choices.");
        }
      }
      if (type === "dropdown" && (!Array.isArray(q.options) || !q.options.length)) {
        errors.push(qw + " is dropdown but has no options.");
      }
      if (type === "matching" && (!Array.isArray(q.left) || !Array.isArray(q.right))) {
        errors.push(qw + " is matching but is missing left or right.");
      }
      if (type === "fields" && (!Array.isArray(q.fields) || !q.fields.length)) {
        errors.push(qw + " is fields but has no fields.");
      }
      if (type === "parts" && (!Array.isArray(q.parts) || !q.parts.length)) {
        errors.push(qw + " is parts but has no parts.");
      }
      if (type === "parts") {
        (q.parts || []).forEach((p, pi) => {
          if ((p && p.type) === "parts") errors.push(qw + ".parts[" + pi + "] nests parts inside parts.");
        });
      }
      if (type === "fill" && String(q.prompt || "").indexOf("___") < 0) {
        warnings.push(qw + " is fill but its prompt has no ___ blanks.");
      }
      if (q.passage && !passageIds[q.passage]) {
        warnings.push(qw + ' names passage "' + q.passage + '", which this section does not define.');
      }
      if (q.figure && !q.figure.alt) {
        warnings.push(qw + " has a figure with no alt text.");
      }
    });
  });

  if (!questionCount) errors.push("The file contains no questions.");

  /* Key block, when present. */
  if (data.key) {
    const k = data.key;
    const answers = k.answers;
    if (!k.salt) errors.push("The answer key has no salt, so nothing can be verified against it.");
    if (!answers || typeof answers !== "object") errors.push("The answer key has no answers.");
    else {
      const unknown = Object.keys(answers).filter((id) => id !== "salt" && id !== "algo" && !seenIds[id]);
      if (unknown.length) {
        warnings.push("The answer key names " + unknown.length +
          " question id" + (unknown.length === 1 ? "" : "s") +
          " this test does not contain (" + unknown.slice(0, 5).join(", ") + ").");
      }
    }
  }

  /* String-level traps. */
  let trapped = 0;
  let unbalanced = 0;
  walkStrings(data, "", (s) => {
    if (LATEX_TRAP.test(s)) trapped += 1;
    if (countDelimiters(s) % 2 !== 0) unbalanced += 1;
  });
  if (trapped) {
    warnings.push(trapped + " string" + (trapped === 1 ? "" : "s") +
      " contain a control character, which usually means a LaTeX command was " +
      "written with one backslash instead of two (\\frac rather than \\\\frac). " +
      "That math will not render.");
  }
  if (unbalanced) {
    warnings.push(unbalanced + " string" + (unbalanced === 1 ? " has" : "s have") +
      " an odd number of $ delimiters; the math in them may render as raw LaTeX.");
  }

  return { ok: errors.length === 0, errors, warnings, questionCount };
}

export { QUESTION_TYPES };
