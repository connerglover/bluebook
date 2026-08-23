import { defineConfig } from "vite";

// Two entries, not one SPA: the key builder is a separate page so that nothing
// in it — not even a stray import — can end up in the bundle the test-taker
// loads. index.html is the sign-in screen and the exam runtime.
export default defineConfig({
  appType: "mpa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: { main: "index.html", author: "author.html" },
    },
  },
});
