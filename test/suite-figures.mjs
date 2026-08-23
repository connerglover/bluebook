/* Figures and the SVG scrubber. A .bbtest is untrusted input rendered into the
   app's own origin, so the scrubbing is a security boundary, not a nicety. */
import { boot, readFixture } from "./harness.mjs";
import { suite, group, ok, eq, done } from "./assert.mjs";

const app = await boot();
const { state, doc, figure, screens } = app;
const S = state.state;
suite("figures");

const svg = (inner, attrs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10" ${attrs}>${inner}</svg>`;

group("the scrubber removes what can execute");
const dirty = figure.sanitizeSvg(svg(
  `<script>window.__PWNED=1;</script>` +
  `<rect width="10" height="10" onload="window.__PWNED=2"/>` +
  `<a href="javascript:window.__PWNED=3"><text y="5">x</text></a>` +
  `<foreignObject width="5" height="5"><div xmlns="http://www.w3.org/1999/xhtml">hi</div></foreignObject>` +
  `<animate attributeName="x" to="9"/>` +
  `<iframe/><circle cx="5" cy="5" r="2"/><!-- note -->`,
  'width="500" height="500"'));
ok("returns markup", typeof dirty === "string");
ok("script gone", !/<script/i.test(dirty));
ok("on* handler gone", !/onload/i.test(dirty));
ok("javascript: href gone", !/javascript:/i.test(dirty));
ok("foreignObject gone", !/foreignObject/i.test(dirty));
ok("animate gone", !/<animate/i.test(dirty));
ok("iframe gone", !/<iframe/i.test(dirty));
ok("comment gone", !/<!--/.test(dirty));

group("but keeps the drawing");
ok("rect kept", /<rect/i.test(dirty));
ok("circle kept", /<circle/i.test(dirty));
ok("text kept", /<text/i.test(dirty));
ok("viewBox kept", /viewBox/i.test(dirty));
ok("fixed width stripped so it scales with zoom", !/width="500"/.test(dirty));
ok("role=img added", /role="img"/.test(dirty));

group("nothing executes when it is inserted");
const probe = doc.createElement("div");
probe.innerHTML = dirty;
doc.body.appendChild(probe);
ok("no side effect", app.window.__PWNED === undefined);
probe.remove();

group("legitimate embedded raster inside an svg is kept");
const withImg = figure.sanitizeSvg(svg(`<image xlink:href="data:image/png;base64,iVBORw0KGgo=" width="4" height="4"/>`));
ok("data:image/png href survives", /data:image\/png/.test(withImg));
const withRemote = figure.sanitizeSvg(svg(`<image xlink:href="https://example.com/x.png" width="4" height="4"/>`));
ok("a remote href is stripped", !/example\.com/.test(withRemote));

group("non-svg input is refused outright");
ok("html is refused", figure.sanitizeSvg("<html><body>x</body></html>") === null);
ok("empty is refused", figure.sanitizeSvg("") === null);
ok("plain text is refused", figure.sanitizeSvg("not markup at all") === null);

group("renderFigure: svg");
const f1 = figure.renderFigure({ svg: svg('<circle cx="5" cy="5" r="4"/>'), alt: "A circle.", caption: "Figure 1" });
ok("returns a <figure>", f1.tagName.toLowerCase() === "figure");
ok("svg present", !!f1.querySelector("svg"));
eq("aria-label carries the alt", f1.querySelector("svg").getAttribute("aria-label"), "A circle.");
ok("caption rendered", /Figure 1/.test(f1.querySelector("figcaption").textContent));
ok("screen-reader description present", !!f1.querySelector(".sr-only"));

group("renderFigure: raster allowlist");
ok("png data uri accepted", !!figure.renderFigure({ src: "data:image/png;base64,iVBORw0KGgo=", alt: "x" }).querySelector("img"));
ok("jpeg accepted", !!figure.renderFigure({ src: "data:image/jpeg;base64,/9j/4AAQ", alt: "x" }).querySelector("img"));
ok("webp accepted", !!figure.renderFigure({ src: "data:image/webp;base64,UklGRg==", alt: "x" }).querySelector("img"));
ok("svg+xml data uri REFUSED — it would smuggle markup past the scrubber",
   !!figure.renderFigure({ src: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", alt: "x" }).querySelector(".qfigure-missing"));
ok("https url refused — the app must work offline",
   !!figure.renderFigure({ src: "https://example.com/x.png", alt: "x" }).querySelector(".qfigure-missing"));
ok("javascript: refused",
   !!figure.renderFigure({ src: "javascript:alert(1)", alt: "x" }).querySelector(".qfigure-missing"));

group("a broken figure degrades to its description, not a hole");
const broken = figure.renderFigure({ svg: "<not-svg/>", alt: "A velocity graph crossing zero at t=4." });
const msg = broken.querySelector(".qfigure-missing");
ok("says something", !!msg);
ok("and includes the description", /velocity graph/.test(msg.textContent));
ok("null spec returns null", figure.renderFigure(null) === null);
ok("garbage spec returns null", figure.renderFigure("nope") === null);

group("describeFigure, for the results file");
ok("uses alt and caption", /velocity/.test(figure.describeFigure({ alt: "a velocity graph", caption: "Fig 1" })));
ok("copes with neither", /no description/.test(figure.describeFigure({})));

group("in a real question");
app.start(readFixture("demo-keyed.bbtest"), "Tester");
app.begin();
S.i = 3; screens.go("question");   // q4 carries the velocity-graph svg
const inQ = doc.querySelector("#solo .qfigure");
ok("figure rendered on the question", !!inQ);
ok("as inline svg", !!inQ.querySelector("svg"));
ok("with its caption", !!inQ.querySelector("figcaption"));
ok("figure sits after the stem", doc.querySelector("#solo .stem").compareDocumentPosition(inQ) & 4);

group("validator warns about a figure with no alt");
const noAlt = readFixture("demo-keyed.bbtest");
delete noAlt.sections[0].questions[3].figure.alt;
const rep = app.validate.validateTest(noAlt);
ok("still loads", rep.ok);
ok("but warns", rep.warnings.some(w => /alt text/.test(w)));

done(app);
