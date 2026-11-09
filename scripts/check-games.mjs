/**
 * Headless smoke check for the self-hosted mini games.
 *
 * Loads each public/games/<slug>/index.html in jsdom with a stubbed 2D canvas
 * context, starts a game, presses keys and waits a few frames. Any uncaught
 * exception fails the run. This catches typos, missing DOM ids and broken game
 * loops without a browser:
 *
 *   node scripts/check-games.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve("public/games");

/** A 2D context stub: every method is a no-op, every property assignable. */
function stubContext() {
  return new Proxy(
    {
      canvas: { width: 600, height: 600 },
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({}),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        return typeof key === "string" ? () => undefined : undefined;
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
}

async function checkGame(slug) {
  const file = path.join(ROOT, slug, "index.html");
  const html = fs.readFileSync(file, "utf8");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (...args) => errors.push(new Error(args.join(" "))));

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    url: "http://localhost/games/" + slug + "/",
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => stubContext();
      window.addEventListener("error", (event) => errors.push(event.error || new Error(event.message)));
      window.addEventListener("unhandledrejection", (event) => errors.push(event.reason));
    },
  });

  const { window } = dom;

  // click the start button if the game has one
  await new Promise((resolve) => window.setTimeout(resolve, 60));
  const start = window.document.getElementById("startBtn");
  if (start) start.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  await new Promise((resolve) => window.setTimeout(resolve, 120));

  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"];
  for (const code of keys) {
    window.dispatchEvent(new window.KeyboardEvent("keydown", { code, key: code === "Space" ? " " : "x", bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  // exercise the on-screen controls when present
  for (const id of ["pad", "bets", "tools", "actions"]) {
    const el = window.document.getElementById(id);
    if (!el) continue;
    const button = el.querySelector("button");
    if (button) button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250));
  dom.window.close();

  const real = errors.filter((error) => String(error && error.message || error).length > 0);
  return { slug, errors: real };
}

const slugs = fs
  .readdirSync(ROOT)
  .filter((name) => fs.existsSync(path.join(ROOT, name, "index.html")))
  .sort();

let failed = 0;
for (const slug of slugs) {
  let result;
  try {
    result = await checkGame(slug);
  } catch (error) {
    result = { slug, errors: [error] };
  }
  if (result.errors.length) {
    failed += 1;
    console.log(`✗ ${slug}`);
    for (const error of result.errors.slice(0, 3)) console.log("   ", String(error.stack || error.message || error).split("\n").slice(0, 3).join("\n    "));
  } else {
    console.log(`✓ ${slug}`);
  }
}

console.log(failed ? `\n${failed} game(s) failed` : `\nAll ${slugs.length} games booted cleanly`);
process.exit(failed ? 1 : 0);
