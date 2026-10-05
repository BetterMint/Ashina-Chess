import esbuild from "esbuild";
import fs from "node:fs";

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

// The manifest injects js/Ashina.js as a classic script into the page world,
// so the bundle must stay IIFE. Default output is unminified so the shipped
// extension stays debuggable; `npm run minify` produces the compact build.
const options = {
  entryPoints: ["js/src/index.js"],
  outfile: "js/Ashina.js",
  bundle: true,
  format: "iife",
  target: ["chrome110"],
  legalComments: "inline",
  logLevel: "info",
  minify,
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("watching…");
  } else {
    await esbuild.build(options);
    const size = fs.statSync("js/Ashina.js").size;
    console.log(`built js/Ashina.js (${(size / 1024).toFixed(1)} KB)`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
