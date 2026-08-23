# Test file schema

**This file moved.** The authoritative spec is
[`docs/test-file-format.md`](../docs/test-file-format.md) in this repo.

It changed in ways that matter, so do not work from memory of the old one:

- A test is now a standalone **`.bbtest`** JSON file. Nothing is spliced into a
  runtime, and there is no `TEST_DATA` block or build script any more. The
  student loads the file from the app's sign-in screen.
- `meta.testerName` is gone. The app asks for the name at sign-in.
- **Figures are supported.** Inline SVG, or a base64 data URI for a real
  photograph. `alt` is required. The old "describe every graph in words"
  rule is now a fallback, not a law.
- **Passages** let one source text serve a run of questions, keeping its scroll
  position and highlights between them.
- `meta.scoreReveal` controls what the student is told about their
  multiple-choice score at the end.
- A `key` block, built at `/author.html`, lets the app check the
  multiple-choice questions itself.

For guidance on writing the questions themselves, see
[`docs/authoring-questions.md`](../docs/authoring-questions.md).
