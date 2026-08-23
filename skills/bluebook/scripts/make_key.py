#!/usr/bin/env python3
"""Attach a scrambled answer key to a .bbtest file.

Each answer is stored as SHA-256(salt : questionId : canonicalAnswer), which
stops a student reading the key out of the file or the devtools console.

Be honest about what that is. The salt ships with the file because the browser
needs it to verify against, and with five choices per question anyone willing
to write a five-iteration loop recovers the whole key. It defeats a casual look
and nothing more. If a key genuinely must stay secret, it cannot be in the
browser at all — score it by hand instead.

The canonical form is always letter-based, which is why case, spacing and
option wording can never cause a mismatch between what you type here and what
the app computes from the student's click:

    mcq, truefalse, dropdown   "B"
    multi                      "A,C"          sorted, comma-joined
    matching                   "1-B,2-C,3-A"  sorted by left index

Usage — answers inline:

    python make_key.py unit-4.bbtest -a q1=B q2=A,C q3=D -o unit-4-keyed.bbtest

Usage — answers from a file (one `id: answer` per line, blank lines and
lines starting with # ignored):

    python make_key.py unit-4.bbtest -k key.txt -o unit-4-keyed.bbtest

Add --reveal to set what the student is told at the end:
    none      nothing; the score still goes into the results file (default)
    total     the number correct out of the number keyed
    detailed  the total plus which questions were missed

--reveal detailed hands the key away by elimination on a retake. Use it for a
one-off review, not for a test you plan to reuse.
"""

import argparse
import hashlib
import json
import os
import re
import secrets
import sys

# Windows consoles default to a legacy code page, which turns every em-dash in
# this output into a replacement character. Ask for UTF-8 and carry on if the
# runtime is too old to offer it.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


SCORABLE_TYPES = {"mcq", "multi", "truefalse", "dropdown", "matching"}
REVEAL_MODES = ("none", "total", "detailed")


def letter(i):
    return chr(65 + i)


def canonical_from_plain(qtype, plain):
    """Parse an author's plaintext answer into the canonical form.

    Accepts "B", "b", " b ", "A,C", "C, A", "ac", "1-A, 2-C", "1->A; 2->C".
    Returns None when it cannot be parsed, so the caller can complain rather
    than silently keying the wrong thing.
    """
    s = str(plain or "").strip()
    if not s:
        return None

    if qtype in ("mcq", "truefalse", "dropdown"):
        letters = re.sub(r"[^A-Za-z]", "", s).upper()
        return letters if len(letters) == 1 else None

    if qtype == "multi":
        letters = re.sub(r"[^A-Za-z]", "", s).upper()
        if not letters:
            return None
        return ",".join(sorted(set(letters)))

    if qtype == "matching":
        pairs = []
        for chunk in re.split(r"[,;]+", s):
            chunk = chunk.strip()
            if not chunk:
                continue
            m = re.fullmatch(r"(\d+)\s*(?:->|-|:|=)?\s*([A-Za-z])", chunk)
            if not m:
                return None
            pairs.append((int(m.group(1)), m.group(2).upper()))
        if not pairs:
            return None
        pairs.sort()
        return ",".join("%d-%s" % (n, L) for n, L in pairs)

    return None


def hash_answer(salt, question_id, canonical):
    payload = "%s:%s:%s" % (salt, question_id, canonical)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def new_salt():
    return secrets.token_hex(16)


def scorable_questions(data):
    """Every question the app can auto-score, in order, with its choice counts."""
    out = []
    n = 0
    for sec in data.get("sections") or []:
        for q in sec.get("questions") or []:
            n += 1
            qid = q.get("id") or ("q%d" % n)
            qtype = q.get("type", "mcq")
            if qtype not in SCORABLE_TYPES:
                continue
            if qtype == "truefalse":
                choices = 2
            elif qtype == "dropdown":
                choices = len(q.get("options") or [])
            else:
                choices = len(q.get("choices") or [])
            out.append({
                "id": qid,
                "number": n,
                "type": qtype,
                "choices": choices,
                "left": len(q.get("left") or []),
                "right": len(q.get("right") or []),
            })
    return out


def in_range(q, canonical):
    """Reject a letter the question does not actually offer.

    Keying q3=F on a five-choice question would otherwise produce a hash that
    can never match anything, and the student would lose the mark with no way
    to tell why.
    """
    if q["type"] == "matching":
        parts = canonical.split(",")
        if len(parts) != q["left"]:
            return False
        for p in parts:
            num, L = p.split("-")
            if not (1 <= int(num) <= q["left"]):
                return False
            if not ("A" <= L <= letter(q["right"] - 1)):
                return False
        return True
    if not q["choices"]:
        return True
    top = letter(q["choices"] - 1)
    return all("A" <= L <= top for L in canonical.split(","))


def parse_key_file(path):
    answers = {}
    with open(path, encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([A-Za-z0-9_-]+)\s*[:.)=]\s*(.+)$", line)
            if not m:
                raise ValueError("line %d is not `id: answer`: %r" % (lineno, line))
            answers[m.group(1)] = m.group(2).strip()
    return answers


def main():
    ap = argparse.ArgumentParser(
        description="Attach a hashed answer key to a .bbtest file.")
    ap.add_argument("path", help="the .bbtest to key")
    ap.add_argument("-a", "--answer", action="append", default=[],
                    metavar="ID=ANSWER",
                    help="an answer, e.g. -a q1=B (repeatable)")
    ap.add_argument("-k", "--key-file",
                    help="a file of `id: answer` lines")
    ap.add_argument("-o", "--out",
                    help="output path (default: alongside the input, -keyed)")
    ap.add_argument("--reveal", choices=REVEAL_MODES,
                    help="what the student is told at the end")
    ap.add_argument("--in-place", action="store_true",
                    help="overwrite the input file")
    args = ap.parse_args()

    with open(args.path, encoding="utf-8") as fh:
        data = json.load(fh)

    plain = {}
    if args.key_file:
        plain.update(parse_key_file(args.key_file))
    for pair in args.answer:
        if "=" not in pair:
            print("Not an ID=ANSWER pair: %r" % pair)
            return 2
        k, v = pair.split("=", 1)
        plain[k.strip()] = v.strip()

    if not plain:
        print("No answers given. Use -a q1=B or -k key.txt.")
        print("")
        print("Questions this test can auto-score:")
        for q in scorable_questions(data):
            rng = ("%d left / %d right" % (q["left"], q["right"])
                   if q["type"] == "matching"
                   else ("A-%s" % letter(q["choices"] - 1) if q["choices"] else "?"))
            print("  %3d  %-10s  %-9s  %s" % (q["number"], q["id"], q["type"], rng))
        return 2

    by_id = {q["id"]: q for q in scorable_questions(data)}

    salt = new_salt()
    answers = {}
    problems = []

    for qid, raw in plain.items():
        q = by_id.get(qid)
        if not q:
            problems.append("%s: not a question this test can auto-score "
                            "(free response is graded by a human)" % qid)
            continue
        canon = canonical_from_plain(q["type"], raw)
        if canon is None:
            problems.append("%s: could not read %r as a %s answer"
                            % (qid, raw, q["type"]))
            continue
        if not in_range(q, canon):
            problems.append("%s: %r is outside the choices this question "
                            "offers" % (qid, raw))
            continue
        answers[qid] = hash_answer(salt, qid, canon)

    if problems:
        print("Nothing was written. Fix these first:")
        for p in problems:
            print("  " + p)
        return 1

    data["key"] = {"algo": "sha256-v1", "salt": salt, "answers": answers}
    if args.reveal:
        data.setdefault("meta", {})["scoreReveal"] = args.reveal

    if args.in_place:
        out = args.path
    elif args.out:
        out = args.out
    else:
        base, ext = os.path.splitext(args.path)
        out = base + "-keyed" + (ext or ".bbtest")

    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    unkeyed = [q["id"] for q in by_id.values() if q["id"] not in answers]
    print("Wrote %s" % out)
    print("  keyed %d of %d auto-scorable question(s)"
          % (len(answers), len(by_id)))
    if unkeyed:
        print("  not keyed (will not count toward the score): %s"
              % ", ".join(unkeyed))
    print("  scoreReveal: %s"
          % (data.get("meta", {}).get("scoreReveal", "none")))
    print("")
    print("  The plaintext answers are NOT in this file. Keep your own copy of")
    print("  the key — the app cannot tell you what the right answer was, only")
    print("  whether the student's matched.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
