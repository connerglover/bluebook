/* Registers the CSS stub loader. Resolved relative to THIS file, so the suites
   run the same whether they are launched from the repo root or from test/. */
import { register } from "node:module";
register("./css-stub-loader.mjs", import.meta.url);
