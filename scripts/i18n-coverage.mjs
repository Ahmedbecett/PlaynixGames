/**
 * Translation coverage report.
 *
 * English is the source of truth. Every other locale may be partial — missing
 * keys fall back to English at runtime — so this script exists to make the gap
 * visible instead of invisible:
 *
 *   npm run i18n:coverage           # table for every locale
 *   npm run i18n:coverage -- --missing ru
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE = path.resolve("src/lib/i18n/dictionary.ts");
const src = fs.readFileSync(SOURCE, "utf8");

/** Extract the object literal of `export const <name> … = { … }`. */
function blockFor(name) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) return null;
  const open = src.indexOf("{", start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

function keysOf(name) {
  const block = blockFor(name);
  if (!block) return [];
  return [...block.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]);
}

const locales = ["en", "ar", "fr", "es", "ru"];
const enKeys = keysOf("en");
if (enKeys.length === 0) {
  console.error("Could not read the English dictionary.");
  process.exit(1);
}

const wanted = process.argv.includes("--missing")
  ? process.argv[process.argv.indexOf("--missing") + 1]
  : null;

if (wanted) {
  const keys = new Set(keysOf(wanted));
  const missing = enKeys.filter((key) => !keys.has(key));
  if (missing.length === 0) {
    console.log(`${wanted} is fully translated (${enKeys.length} keys).`);
  } else {
    console.log(`${wanted}: ${missing.length} of ${enKeys.length} keys still missing\n`);
    for (const key of missing) console.log(`  "${key}": "",`);
  }
  process.exit(0);
}

const rows = [];
for (const locale of locales) {
  const keys = new Set(keysOf(locale));
  const translated = enKeys.filter((key) => keys.has(key)).length;
  const extra = [...keys].filter((key) => !enKeys.includes(key));
  const pct = ((translated / enKeys.length) * 100).toFixed(1);
  rows.push({ locale, translated, total: enKeys.length, pct: `${pct}%`, invalid: extra.length });
}

const width = Math.max(...rows.map((r) => r.locale.length), 6);
console.log(`\n${"locale".padEnd(width)}  translated  total   coverage  invalid-keys`);
console.log("-".repeat(width + 42));
for (const row of rows) {
  console.log(
    `${row.locale.padEnd(width)}  ${String(row.translated).padStart(10)}  ${String(row.total).padStart(5)}  ${row.pct.padStart(9)}  ${row.invalid === 0 ? "0" : row.invalid}`,
  );
}
console.log(`\nMissing keys render in English at runtime. Translate them in src/lib/i18n/dictionary.ts.`);
const invalid = rows.filter((row) => row.invalid > 0);
if (invalid.length > 0) {
  console.error(`\n✗ ${invalid.map((r) => r.locale).join(", ")} define keys that do not exist in English.`);
  process.exit(1);
}
