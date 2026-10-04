#!/usr/bin/env bash
# Runs every suite against the modules in ../src.
#
# Each suite gets its own node process on purpose: the harness imports the real
# application modules, which hold module-level state bound to one jsdom window.
# Two suites in one process would share that state.
cd "$(dirname "$0")" || exit 1

[ -d ../node_modules ] || { echo "run 'npm install' in the repo root first"; exit 1; }

SUITES="suite-model suite-questions suite-navigation suite-clock suite-passages
        suite-figures suite-scoring suite-persist suite-results suite-validate
        suite-highlight suite-calc suite-narrow suite-loader suite-e2e
        suite-embed"

fail=0
for s in $SUITES; do
  printf '%-20s' "$s"
  out=$(timeout 180 node --import ./register-loader.mjs "$s.mjs" 2>&1)
  line=$(printf '%s\n' "$out" | grep -E 'ALL PASSED|FAILURE' | tail -1)
  if [ -z "$line" ]; then
    echo "NO OUTPUT  (see: node --import ./register-loader.mjs $s.mjs)"
    fail=1
  else
    echo "$line"
    case "$line" in *FAILURE*) fail=1 ;; esac
  fi
done

if [ "$fail" -eq 0 ]; then echo; echo "all suites passed"; fi
exit $fail
