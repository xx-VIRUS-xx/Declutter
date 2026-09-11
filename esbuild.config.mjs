import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  target: "chrome102",
  sourcemap: true,
  logLevel: "info",
  outdir: "dist",
};

// Background is declared as an ES module in the manifest ("type": "module"),
// so it can use ESM output. Content scripts and the popup script run as
// classic scripts, so they must be bundled as self-contained IIFEs.
const jobs = [
  {
    ...common,
    entryPoints: { "background/index": "src/background/index.ts" },
    format: "esm",
  },
  {
    ...common,
    entryPoints: { "content/index": "src/content/index.ts" },
    format: "iife",
  },
  {
    ...common,
    entryPoints: { "popup/popup": "src/popup/index.ts" },
    format: "iife",
  },
];

if (watch) {
  const contexts = await Promise.all(jobs.map((job) => esbuild.context(job)));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("Watching for changes...");
} else {
  await Promise.all(jobs.map((job) => esbuild.build(job)));
}
