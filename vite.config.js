import { defineConfig } from "vite";

// Two entries, not one SPA: the key builder is a separate page so that nothing
// in it — not even a stray import — can end up in the bundle the test-taker
// loads. index.html is the sign-in screen and the exam runtime.
export default defineConfig({
  // A host that serves the app under a subpath (embed mode) builds with
  // BB_BASE=/that/path/. The standalone site stays at the root.
  base: process.env.BB_BASE || "/",
  appType: "mpa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { main: "index.html", author: "author.html" },
    },
  },
});
