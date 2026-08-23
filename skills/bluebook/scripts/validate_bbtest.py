#!/usr/bin/env python3
"""Validate a .bbtest file before anyone sits it.

The app validates on load too, but by then the student is already looking at
the screen. Catching problems here means the file that gets handed over is one
that works.

Two classes of finding:

  ERROR    the app will refuse to load the file. Must be fixed.
  WARNING  the file loads, but something is probably wrong with the question.

The warnings are heuristics, not laws. A few of them (the "this prompt asks for
three things but has one input" family) are the difference between a test that
feels real and one that feels generated, so read them rather than skimming
past. But they are judgement calls, and sometimes the judgement is that the
question is fine.

    python validate_bbtest.py unit-4.bbtest
    python validate_bbtest.py unit-4.bbtest --strict   # warnings exit non-zero
"""

import argparse
import json
import re
import sys
import unicodedata

# Windows consoles default to a legacy code page, which turns every em-dash in
# this output into a replacement character. Ask for UTF-8 and carry on if the
# runtime is too old to offer it.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


QUESTION_TYPES = {
    "mcq", "multi", "truefalse", "dropdown", "matching",
    "fill", "short", "essay", "math", "parts", "fields",
}
CHOICE_TYPES = {"mcq", "multi"}
SCORABLE_TYPES = {"mcq", "multi", "truefalse", "dropdown", "matching"}
REVEAL_MODES = {"none", "total", "detailed"}

# JSON silently accepts \f, \b, \v, \t, \r. "$\frac{1}{2}$" written with ONE
# backslash parses fine and yields a formfeed followed by "rac{1}{2}" — no
# error anywhere, the LaTeX just disappears. This is the single most common way
# a generated test breaks, so it is checked by name.
LATEX_TRAP = re.compile(r"[\f\b\v]")

RASTER_DATA_URI = re.compile(
    r"^data:image/(png|jpeg|jpg|gif|webp|avif);base64,[A-Za-z0-9+/=\s]+$", re.I)

# Verbs that mean "the answer is reasoning, not a value".
REASONING = re.compile(
    r"\b(justify|explain|show that|verify|prove|give a reason|reasoning|"
    r"why (?:is|does|do|would)|interpret|describe (?:the|what|how))\b", re.I)

# "State the amplitude, period, and phase shift" — a list of things being asked.
MULTI_ASK = re.compile(
    r"\b(?:state|find|give|determine|list|identify|compute|calculate)\b[^.?!]*?"
    r"\b\w+\s*,\s*[^.?!]*?\band\b\s+[^.?!]*", re.I)

MATHY = re.compile(
    r"(\$)|\b(domain|range|derivative|integral|limit|slope|equation|"
    r"amplitude|period|asymptote|interval|value of|area|volume)\b", re.I)


class Findings:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, msg):
        self.errors.append((where, msg))

    def warn(self, where, msg):
        self.warnings.append((where, msg))


def walk_strings(value, path, visit):
    if isinstance(value, str):
        visit(value, path)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            walk_strings(v, "%s[%d]" % (path, i), visit)
    elif isinstance(value, dict):
        for k, v in value.items():
            walk_strings(v, ("%s.%s" % (path, k)) if path else k, visit)


def count_delimiters(s):
    """Count unescaped $ characters."""
    n = 0
    for i, ch in enumerate(s):
        if ch == "$" and (i == 0 or s[i - 1] != "\\"):
            n += 1
    return n


def check_figure(fig, where, f):
    if not isinstance(fig, dict):
        f.error(where, "figure is not an object.")
        return
    if not str(fig.get("alt", "")).strip():
        f.warn(where, "figure has no alt text. Someone who cannot see it "
                      "cannot answer the question.")
    elif len(str(fig["alt"]).strip()) < 25:
        f.warn(where, "figure alt text is very short (%d chars). It should "
                      "carry whatever the question turns on."
                      % len(str(fig["alt"]).strip()))

    if fig.get("svg"):
        svg = str(fig["svg"])
        if "<svg" not in svg.lower():
            f.error(where, "figure.svg does not contain an <svg> element.")
        if "viewBox" not in svg and "viewbox" not in svg.lower():
            f.warn(where, "figure.svg has no viewBox, so it will not scale "
                          "with zoom.")
        for banned in ("<script", "onload=", "onclick=", "<foreignObject",
                       "javascript:"):
            if banned.lower() in svg.lower():
                f.warn(where, "figure.svg contains %r, which the app strips "
                              "before rendering. Remove it." % banned)
    elif fig.get("src"):
        src = str(fig["src"]).strip()
        if not RASTER_DATA_URI.match(src):
            if src.lower().startswith("data:image/svg"):
                f.error(where, "figure.src is an SVG data URI, which the app "
                               "refuses. Put the markup in figure.svg instead.")
            elif src.lower().startswith(("http://", "https://")):
                f.error(where, "figure.src is a remote URL. The app only "
                               "accepts base64 data: URIs so tests work offline.")
            else:
                f.error(where, "figure.src must be a base64 data: URI of a "
                               "png, jpeg, gif, webp or avif.")
    else:
        f.error(where, "figure has neither svg nor src.")


def check_authoring(q, qtype, where, f):
    """Heuristics for the single biggest quality failure: a prompt that asks
    for several things wired to one answer box."""
    prompt = str(q.get("prompt", ""))
    if not prompt:
        return

    single_value = qtype in ("math", "short")

    if single_value and REASONING.search(prompt):
        f.warn(where, "the prompt asks for reasoning (\"%s\") but the answer "
                      "is a single %s box. Reasoning needs an `essay`; a value "
                      "plus a justification needs `fields`."
               % (REASONING.search(prompt).group(0), qtype))

    if single_value and MULTI_ASK.search(prompt):
        f.warn(where, "the prompt looks like it asks for more than one thing "
                      "but has a single input. Count what is being asked and "
                      "give it that many inputs with `fields`.")

    if qtype == "short" and MATHY.search(prompt):
        f.warn(where, "this looks like a mathematical answer in a `short` text "
                      "box. Use `math` so it renders as it is typed and comes "
                      "back as LaTeX rather than as \"[-inf, 4]\".")

    if qtype in CHOICE_TYPES:
        choices = q.get("choices") or []
        texts = [str(c).strip().lower() for c in choices]
        if len(set(texts)) != len(texts):
            f.warn(where, "two answer choices are identical.")
        for c in texts:
            if c in ("all of the above", "none of the above"):
                f.warn(where, "\"%s\" tests test-taking rather than the "
                              "subject. Prefer a real distractor." % c)

    if re.search(r"\bthe (graph|figure|diagram|image) (shown|above|below)\b",
                 prompt, re.I) and not q.get("figure") and not q.get("stimulus"):
        f.error(where, "the prompt refers to a figure that this question does "
                       "not have. Add a `figure`, or describe it in words.")


def validate(data, path_label="<file>"):
    f = Findings()

    if not isinstance(data, dict):
        f.error(path_label, "The file is not a test object.")
        return f

    meta = data.get("meta") or {}
    if not meta.get("title"):
        f.warn("meta", "no title; the test will be called \"Practice Test\".")
    reveal = meta.get("scoreReveal")
    if reveal is not None and str(reveal) not in REVEAL_MODES:
        f.warn("meta.scoreReveal", "must be one of %s; the app will treat it "
                                   "as \"none\"." % ", ".join(sorted(REVEAL_MODES)))

    sections = data.get("sections")
    if not isinstance(sections, list) or not sections:
        f.error("sections", "the file has no sections.")
        return f

    seen_ids = {}
    scorable_ids = set()
    question_count = 0

    for si, sec in enumerate(sections):
        where = "sections[%d]" % si
        if not isinstance(sec, dict):
            f.error(where, "is not an object.")
            continue
        if not sec.get("name"):
            f.warn(where, "has no name.")
        if "calculator" not in sec:
            f.warn(where, "does not set `calculator`. It defaults to false; "
                          "set it explicitly so the policy is deliberate.")
        questions = sec.get("questions")
        if not isinstance(questions, list):
            f.error(where + ".questions", "must be an array.")
            continue

        passage_ids = set()
        for pi, p in enumerate(sec.get("passages") or []):
            pw = "%s.passages[%d]" % (where, pi)
            if not isinstance(p, dict):
                f.error(pw, "is not an object.")
                continue
            if not p.get("text") and not p.get("html"):
                f.warn(pw, "has no text.")
            pid = p.get("id") or ("p%d-%d" % (si + 1, pi + 1))
            if pid in passage_ids:
                f.error(pw, "duplicate passage id %r." % pid)
            passage_ids.add(pid)
            if p.get("figure"):
                check_figure(p["figure"], pw + ".figure", f)

        no_calc = not sec.get("calculator")

        for qi, q in enumerate(questions):
            qw = "%s.questions[%d]" % (where, qi)
            question_count += 1
            if not isinstance(q, dict):
                f.error(qw, "is not an object.")
                continue

            qtype = q.get("type", "mcq")
            if qtype not in QUESTION_TYPES:
                f.error(qw, "unknown type %r." % qtype)

            qid = q.get("id")
            if qid:
                if qid in seen_ids:
                    f.error(qw, "duplicate question id %r (also %s)."
                            % (qid, seen_ids[qid]))
                seen_ids[qid] = qw
                if qtype in SCORABLE_TYPES:
                    scorable_ids.add(qid)
                if re.search(r"[a-z]{4,}", str(qid).replace("q", ""), re.I):
                    f.warn(qw, "id %r is descriptive. Ids appear in the results "
                               "file, so a topic name narrows the answer before "
                               "the student has picked one. Use q1, q2, …" % qid)
            else:
                f.warn(qw, "has no id. One will be generated, but the answer "
                           "key is keyed by id — set it explicitly.")

            if qtype in CHOICE_TYPES:
                choices = q.get("choices")
                if not isinstance(choices, list) or len(choices) < 2:
                    f.error(qw, "is %s but has fewer than two choices." % qtype)
                elif qtype == "mcq" and len(choices) != 5:
                    f.warn(qw, "has %d choices. AP-style packets use five, "
                               "A–E." % len(choices))
            if qtype == "dropdown" and not (isinstance(q.get("options"), list)
                                            and q["options"]):
                f.error(qw, "is dropdown but has no options.")
            if qtype == "matching" and not (isinstance(q.get("left"), list)
                                            and isinstance(q.get("right"), list)):
                f.error(qw, "is matching but is missing left or right.")
            if qtype == "fields" and not (isinstance(q.get("fields"), list)
                                          and q["fields"]):
                f.error(qw, "is fields but has no fields.")
            if qtype == "fields":
                for fi, fld in enumerate(q.get("fields") or []):
                    if isinstance(fld, dict) and not fld.get("label"):
                        f.warn("%s.fields[%d]" % (qw, fi),
                               "has no label, so the boxes cannot be told apart.")
                    if isinstance(fld, dict) and fld.get("type") in ("fields", "parts"):
                        f.error("%s.fields[%d]" % (qw, fi),
                                "%s cannot nest inside fields." % fld["type"])
            if qtype == "parts":
                parts = q.get("parts")
                if not isinstance(parts, list) or not parts:
                    f.error(qw, "is parts but has no parts.")
                else:
                    for pi2, p2 in enumerate(parts):
                        if isinstance(p2, dict) and p2.get("type") == "parts":
                            f.error("%s.parts[%d]" % (qw, pi2),
                                    "parts cannot nest inside parts.")
            if qtype == "fill" and "___" not in str(q.get("prompt", "")):
                f.warn(qw, "is fill but its prompt has no ___ blanks.")

            if q.get("passage") and q["passage"] not in passage_ids:
                f.warn(qw, "names passage %r, which this section does not "
                           "define." % q["passage"])
            if q.get("figure"):
                check_figure(q["figure"], qw + ".figure", f)
            for pi2, p2 in enumerate(q.get("parts") or []):
                if isinstance(p2, dict) and p2.get("figure"):
                    check_figure(p2["figure"], "%s.parts[%d].figure" % (qw, pi2), f)

            check_authoring(q, qtype, qw, f)

            if no_calc:
                for m in re.finditer(r"\b\d+\.\d{2,}\b", str(q.get("prompt", ""))):
                    f.warn(qw, "no-calculator section contains %s. Every number "
                               "here should be workable by hand." % m.group(0))
                    break

    if not question_count:
        f.error("sections", "the file contains no questions.")

    # Correct answers clustered in one position is a tell.
    key = data.get("key")
    if key:
        if not isinstance(key, dict):
            f.error("key", "is not an object.")
        else:
            if not key.get("salt"):
                f.error("key", "has no salt, so nothing can be verified "
                               "against it.")
            answers = key.get("answers")
            if not isinstance(answers, dict) or not answers:
                f.error("key", "has no answers.")
            else:
                unknown = [k for k in answers if k not in seen_ids]
                if unknown:
                    f.warn("key", "names %d question id(s) this test does not "
                                  "contain: %s" % (len(unknown), ", ".join(unknown[:5])))
                unscorable = [k for k in answers
                              if k in seen_ids and k not in scorable_ids]
                if unscorable:
                    f.warn("key", "keys %d question(s) whose type cannot be "
                                  "auto-scored: %s" % (len(unscorable), ", ".join(unscorable[:5])))
                for h in answers.values():
                    if not re.fullmatch(r"[0-9a-f]{64}", str(h)):
                        f.error("key", "an answer is not a sha-256 hex digest. "
                                       "Build the key with make_key.py.")
                        break
                missing = sorted(scorable_ids - set(answers))
                if missing:
                    f.warn("key", "%d scorable question(s) are not keyed and so "
                                  "will not count toward the score: %s"
                           % (len(missing), ", ".join(missing[:8])))

    # String-level traps.
    trapped, unbalanced = [], []

    def visit(s, where):
        if LATEX_TRAP.search(s):
            trapped.append(where)
        if count_delimiters(s) % 2:
            unbalanced.append(where)

    walk_strings(data, "", visit)

    if trapped:
        f.error("(math)", "%d string(s) contain a control character, which "
                          "almost always means a LaTeX command was written with "
                          "one backslash instead of two (\\frac rather than "
                          "\\\\frac). That math is already destroyed — the "
                          "characters are gone from the file. First: %s"
                % (len(trapped), ", ".join(trapped[:3])))
    if unbalanced:
        f.warn("(math)", "%d string(s) have an odd number of $ delimiters, so "
                         "the rest of the question may render as raw LaTeX. "
                         "First: %s" % (len(unbalanced), ", ".join(unbalanced[:3])))

    return f


def main():
    ap = argparse.ArgumentParser(description="Validate a .bbtest file.")
    ap.add_argument("path")
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero on warnings as well as errors")
    ap.add_argument("--quiet", action="store_true",
                    help="print only the summary line")
    args = ap.parse_args()

    try:
        with open(args.path, encoding="utf-8") as fh:
            raw = fh.read()
    except OSError as e:
        print("Could not read %s: %s" % (args.path, e))
        return 2

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        line = raw[:e.pos].count("\n") + 1
        print("INVALID JSON at line %d: %s" % (line, e.msg))
        print("  %s" % raw.splitlines()[line - 1][:110] if line <= len(raw.splitlines()) else "")
        return 2

    f = validate(data, args.path)

    if not args.quiet:
        for where, msg in f.errors:
            print("ERROR    %s: %s" % (where, msg))
        for where, msg in f.warnings:
            print("warning  %s: %s" % (where, msg))
        if f.errors or f.warnings:
            print("")

    n_q = sum(len(s.get("questions") or []) for s in (data.get("sections") or [])
              if isinstance(s, dict))
    size_kb = len(raw.encode("utf-8")) / 1024.0
    print("%s — %d question(s), %.1f KB, %d error(s), %d warning(s)"
          % (args.path, n_q, size_kb, len(f.errors), len(f.warnings)))
    if size_kb > 8192:
        print("  the file is over the app's 8 MB limit and will be refused.")

    if f.errors:
        return 1
    if f.warnings and args.strict:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
