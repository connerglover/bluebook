/* Node cannot parse the `import "./styles/index.css"` lines that Vite handles
   at build time. This loader resolves any .css specifier to an empty module so
   the suites can import the real application modules unchanged. */

export async function resolve(specifier, context, next) {
  if (specifier.endsWith(".css")) {
    return { url: "data:text/javascript,export default {}", shortCircuit: true };
  }
  return next(specifier, context);
}
