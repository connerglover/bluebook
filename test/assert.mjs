/* The tiny assertion helper the old suites used, kept so the output of
   `bash run.sh` still reads the same way. */

let fails = 0;
let name = "suite";

export function suite(n) {
  name = n;
  console.log("\n== " + n + " ==");
}

export function group(label) {
  console.log("\n-- " + label);
}

export function ok(label, cond, extra) {
  if (cond) {
    console.log("  PASS  " + label);
  } else {
    fails += 1;
    console.log("  FAIL  " + label + (extra !== undefined ? "  -> " + extra : ""));
  }
  return !!cond;
}

export function eq(label, got, want) {
  const same = JSON.stringify(got) === JSON.stringify(want);
  return ok(label, same, same ? undefined : "got " + JSON.stringify(got) + ", want " + JSON.stringify(want));
}

export function done(app) {
  if (app) {
    try { app.clock.stopClock(); } catch (e) { /* not booted */ }
    try { app.dom.window.close(); } catch (e) { /* already closed */ }
  }
  if (fails) {
    console.log("\n" + fails + " FAILURE" + (fails === 1 ? "" : "S") + " in " + name + "\n");
    process.exit(1);
  }
  console.log("\nALL PASSED (" + name + ")\n");
  process.exit(0);
}

/* Any exception must fail the suite loudly rather than exiting 0 quietly. */
process.on("uncaughtException", (e) => {
  console.log("  FAIL  uncaught: " + (e && e.stack || e));
  console.log("\n1 FAILURE in " + name + "\n");
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  console.log("  FAIL  unhandled rejection: " + (e && e.stack || e));
  console.log("\n1 FAILURE in " + name + "\n");
  process.exit(1);
});
