/**
 * Marks each build tree with the module type that Node needs, so the same
 * package can be consumed with both `import` and `require`.
 */
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
fs.writeFileSync(path.join(dist, "esm", "package.json"), JSON.stringify({ type: "module" }, null, 2));
fs.writeFileSync(path.join(dist, "cjs", "package.json"), JSON.stringify({ type: "commonjs" }, null, 2));

// Fail the build if a public entrypoint is missing.
for (const file of [
  "esm/index.js",
  "cjs/index.js",
  "esm/server/index.js",
  "cjs/server/index.js",
  "esm/index.d.ts",
  "cjs/index.d.ts",
  "esm/server/index.d.ts",
  "cjs/server/index.d.ts",
]) {
  if (!fs.existsSync(path.join(dist, file))) {
    console.error(`✗ missing build output: dist/${file}`);
    process.exit(1);
  }
}
console.log("✓ playnix-sdk built (ESM + CJS + types)");
