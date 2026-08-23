#!/usr/bin/env python3
"""Turn a .bbresult.json into something readable, for grading.

The results file is complete but verbose — every question, every flag, every
timing. Reading it raw wastes attention on structure instead of on the work.
This prints it in the order a grader actually needs it:

  1. Disputed questions FIRST. A question the student challenged is sometimes a
     question that is genuinely wrong, and marking it incorrect by default is
     how a bad item survives to be asked again.
  2. Pacing, because blanks at the end of a section are a time problem, not a
     content problem, and the advice differs.
  3. The answers themselves, section by section.

    python read_result.py unit-4.bbresult.json
    python read_result.py unit-4.bbresult.json --answers   # answers only
    python read_result.py unit-4.bbresult.json --json      # machine-readable digest
"""

import argparse
import json
import sys

# Windows consoles default to a legacy code page, which turns every em-dash in
# this output into a replacement character. Ask for UTF-8 and carry on if the
# runtime is too old to offer it.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass



def fmt_secs(s):
    s = int(round(s or 0))
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    if h:
        return "%d:%02d:%02d" % (h, m, sec)
    return "%d:%02d" % (m, sec)


def flatten(result):
    out = []
    for sec in result.get("sections") or []:
        for q in sec.get("questions") or []:
            q = dict(q)
            q["section"] = sec.get("name", "")
            out.append(q)
    return out


def answer_text(q):
    a = q.get("answer")
    if isinstance(a, list):                       # a `parts` question
        return "\n".join(
            "      %s %s" % (p.get("part", ""), str(p.get("value", "")).replace("\n", " "))
            for p in a)
    return str(a)


def digest(result):
    """A compact dict, for when the caller wants to reason over it in code."""
    qs = flatten(result)
    auto = result.get("autoScore") or {}
    status = {p["id"]: p["status"] for p in (auto.get("perQuestion") or [])}
    return {
        "tester": result.get("tester", ""),
        "test": (result.get("test") or {}).get("title", ""),
        "course": (result.get("test") or {}).get("course", ""),
        "answered": (result.get("progress") or {}).get("answered"),
        "total": (result.get("progress") or {}).get("total"),
        "auto": {k: auto.get(k) for k in
                 ("scored", "correct", "incorrect", "blank", "percent")} if auto else None,
        "disputed": [d["number"] for d in (result.get("disputed") or [])],
        "marked": (result.get("progress") or {}).get("markedForReview", []),
        "unanswered": (result.get("progress") or {}).get("unanswered", []),
        "questions": [
            {"number": q["number"], "id": q["id"], "type": q["type"],
             "answer": q.get("answer"), "answered": q.get("answered"),
             "marked": q.get("markedForReview"), "issue": q.get("issue"),
             "auto": status.get(q["id"])}
            for q in qs
        ],
    }


def report(result, answers_only=False):
    lines = []
    P = lines.append

    test = result.get("test") or {}
    prog = result.get("progress") or {}
    timing = result.get("timing") or {}
    auto = result.get("autoScore") or {}
    qs = flatten(result)
    status = {p["id"]: p["status"] for p in (auto.get("perQuestion") or [])}

    if not answers_only:
        title = test.get("title", "Untitled")
        if test.get("course"):
            title += " (%s)" % test["course"]
        P("=" * 66)
        P(title)
        P("%s · %s · %s of %s answered · %s used"
          % (result.get("tester") or "—",
             result.get("generatedAtLocal") or result.get("generatedAt", ""),
             prog.get("answered"), prog.get("total"),
             timing.get("totalDisplay") or fmt_secs(timing.get("totalSecondsUsed"))))
        if test.get("gradingNote"):
            P("Note from the author: %s" % test["gradingNote"])
        P("=" * 66)
        P("")

        # ---- disputed first ----
        disputed = result.get("disputed") or []
        if disputed:
            P("DISPUTED — re-check these against the key BEFORE scoring them.")
            P("A valid challenge should drop the question from the denominator,")
            P("not be marked wrong.")
            for d in disputed:
                P("")
                P("  Q%s (%s): %s" % (d.get("number"), d.get("id"), d.get("note", "")))
                q = next((x for x in qs if x.get("id") == d.get("id")), None)
                if q:
                    P("    they answered: %s" % answer_text(q).strip())
                    if status.get(d.get("id")):
                        P("    app scored it: %s" % status[d.get("id")])
            P("")
            P("-" * 66)
            P("")

        # ---- auto score ----
        if auto:
            P("MULTIPLE CHOICE (checked by the app, against this test's key)")
            P("  %s / %s correct  (%s%%)   %s blank"
              % (auto.get("correct"), auto.get("scored"),
                 auto.get("percent"), auto.get("blank")))
            missed = [p["number"] for p in (auto.get("perQuestion") or [])
                      if p.get("status") == "incorrect"]
            blanks = [p["number"] for p in (auto.get("perQuestion") or [])
                      if p.get("status") == "blank"]
            if missed:
                P("  missed: %s" % ", ".join(str(n) for n in missed))
            if blanks:
                P("  blank:  %s" % ", ".join(str(n) for n in blanks))
            P("  Free response is not scored here — that is the part that needs you.")
            P("")
        else:
            P("MULTIPLE CHOICE — this test carried no answer key, so nothing")
            P("was auto-scored. Grade everything against your own key.")
            P("")

        # ---- pacing ----
        P("PACING")
        for sec in result.get("sections") or []:
            limit = sec.get("timeLimitMinutes") or 0
            used = sec.get("timeUsedSeconds") or 0
            nums = [q["number"] for q in (sec.get("questions") or [])
                    if not q.get("answered")]
            note = ""
            if limit and used >= limit * 60 - 5:
                note = "  <- ran the clock out"
            elif nums and len(nums) >= 2 and nums == sorted(nums)[-len(nums):] \
                    and nums[-1] == max(q["number"] for q in sec.get("questions") or [{"number": 0}]):
                note = "  <- blanks are at the END; likely a pacing problem"
            P("  %-28s %s used%s%s"
              % (sec.get("name", ""), fmt_secs(used),
                 (" of %d:00" % limit) if limit else " (untimed)", note))
        P("")

        # ---- flags ----
        marked = prog.get("markedForReview") or []
        unans = prog.get("unanswered") or []
        if marked:
            right = [n for n in marked
                     if status.get(next((q["id"] for q in qs if q["number"] == n), "")) == "correct"]
            P("MARKED FOR REVIEW: %s" % ", ".join(str(n) for n in marked))
            if right:
                P("  got right anyway: %s — a confidence gap worth naming"
                  % ", ".join(str(n) for n in right))
        if unans:
            P("BLANK: %s" % ", ".join(str(n) for n in unans))
        if marked or unans:
            P("")

        notes = result.get("marginNotes") or []
        if notes:
            P("MARGIN NOTES")
            for n in notes:
                P("  Q%s \"%s\" — %s" % (n.get("question"), n.get("quote", ""),
                                          n.get("note", "")))
            P("")
        P("-" * 66)
        P("")

    # ---- the answers ----
    P("ANSWERS")
    for sec in result.get("sections") or []:
        label = sec.get("name", "")
        if sec.get("label"):
            label += " — " + sec["label"]
        P("")
        P("[%s]" % label)
        for q in sec.get("questions") or []:
            tag = ""
            if q.get("markedForReview"):
                tag += " *"
            if q.get("issue"):
                tag += " !"
            mark = {"correct": "OK ", "incorrect": "XX ", "blank": "-- "}.get(
                status.get(q.get("id"), ""), "   ")
            body = answer_text(q)
            head = "  %s%3d. " % (mark, q.get("number"))
            if "\n" in body:
                P(head.rstrip() + tag)
                for ln in body.split("\n"):
                    # `parts` answers already carry their own indent; `fields`
                    # come back as bare "Label = value" lines, so indent those
                    # here or they collide with the left margin.
                    P(ln if ln.startswith("      ") else "        " + ln)
            else:
                P("%s%s%s" % (head, body, tag))
    P("")
    P("  key: OK correct · XX incorrect · -- blank (app-scored only)")
    P("       *  marked for review   !  issue noted")

    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Read a .bbresult.json for grading.")
    ap.add_argument("path")
    ap.add_argument("--answers", action="store_true",
                    help="print only the answers section")
    ap.add_argument("--json", action="store_true",
                    help="print a compact machine-readable digest instead")
    args = ap.parse_args()

    try:
        with open(args.path, encoding="utf-8") as fh:
            result = json.load(fh)
    except json.JSONDecodeError as e:
        print("That file is not valid JSON: %s" % e.msg)
        return 2
    except OSError as e:
        print("Could not read %s: %s" % (args.path, e))
        return 2

    if result.get("kind") != "bbresult":
        print("Warning: this does not look like a .bbresult.json "
              "(kind=%r). Reading it anyway." % result.get("kind"))

    if args.json:
        print(json.dumps(digest(result), indent=2, ensure_ascii=False))
    else:
        print(report(result, answers_only=args.answers))
    return 0


if __name__ == "__main__":
    sys.exit(main())
