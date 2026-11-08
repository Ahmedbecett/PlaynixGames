/**
 * Rewarded-ads contract check — runs entirely offline.
 *
 *   npm run ads:check
 *
 * Covers the three layers that can break independently:
 *   1. config parsing (`src/lib/ads-shared.ts`) — a bad zone id must disable ads,
 *   2. server policy (`src/lib/ads.ts`) — grant / reuse / cooldown / daily cap /
 *      expiry / premium gating, against a throwaway SQLite database,
 *   3. browser wrapper (`src/components/ads/monetag.ts`) — shaped like the real
 *      Monetag SDK (`show_<zone>()`) but injected in jsdom, so the rewarded flow,
 *      the popup fallback, the timeout and the in-app settings are all executed.
 */
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const dbFile = path.join(process.cwd(), "data", "check-ads.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  try {
    fs.unlinkSync(dbFile + suffix);
  } catch {
    /* first run */
  }
}

process.env.SQLITE_PATH = dbFile;
process.env.DATABASE_URL = "";
process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
process.env.NEXT_PUBLIC_ADS_ZONE_ID = "12207042";
process.env.ADS_REWARD_MINUTES = "5";
process.env.ADS_DAILY_LIMIT = "2";
process.env.ADS_COOLDOWN_SECONDS = "0";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
  else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** tsx transpiles these modules to CJS, so dynamic import lands on `.default`. */
async function load<T = Record<string, unknown>>(specifier: string): Promise<T> {
  const mod = (await import(specifier)) as { default?: T } & T;
  return (mod.default ?? mod) as T;
}

async function main() {
  /* ------------------------------------------------------------- config ---- */
  console.log("Ad configuration");
  const shared = await load<typeof import("../src/lib/ads-shared")>("../src/lib/ads-shared.ts");

  const configured = shared.adsPublicConfig();
  check("enabled with a numeric zone", configured.enabled && configured.zoneId === "12207042", configured.zoneId ?? "none");
  check("default SDK url", configured.sdkUrl === "https://libtl.com/sdk.js", configured.sdkUrl);
  check(
    "in-app settings defaults",
    configured.inApp.enabled === false &&
      configured.inApp.frequency === 1 &&
      configured.inApp.cappingHours === 0.1 &&
      configured.inApp.intervalSeconds === 30 &&
      configured.inApp.timeoutSeconds === 5 &&
      configured.inApp.everyPage === true,
    JSON.stringify(configured.inApp),
  );
  check("popup fallback on by default", configured.popupFallback === true);

  check("invalid zone disables ads", shared.adsConfigFrom({ NEXT_PUBLIC_ADS_ZONE_ID: "not-a-zone" }).enabled === false);
  check("missing zone disables ads", shared.adsConfigFrom({ NEXT_PUBLIC_ADS_ZONE_ID: undefined }).enabled === false);
  check("flag off disables ads", shared.adsConfigFrom({ NEXT_PUBLIC_ADS_ENABLED: "false" }).enabled === false);
  check("in-app can be enabled explicitly", shared.adsConfigFrom({ NEXT_PUBLIC_ADS_INAPP_ENABLED: "true" }).inApp.enabled === true);

  check("CSP lists the SDK host", shared.ADS_CSP.script.includes("https://libtl.com"));
  const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
  check("next.config wires ADS_CSP into the CSP", nextConfig.includes("ADS_CSP") && nextConfig.includes("adsPublicConfig"));
  check("zone function name matches the provider", shared.monetagFunctionName("12207042") === "show_12207042");

  // Regression guard: Next.js only inlines `process.env.NEXT_PUBLIC_*` when the
  // property is spelled out literally. A dynamic lookup compiles to the empty
  // browser `process` shim, which once hid every ad surface in production.
  const sharedSource = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ads-shared.ts"), "utf8");
  // Comments mention the anti-pattern on purpose; only real code counts.
  const sharedCode = sharedSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check(
    "shared config never reads env dynamically",
    !/process\.env\[/.test(sharedCode),
    /process\.env\[/.test(sharedCode) ? "found process.env[name]" : "",
  );
  const publicVars = [
    "NEXT_PUBLIC_ADS_ENABLED",
    "NEXT_PUBLIC_ADS_ZONE_ID",
    "NEXT_PUBLIC_ADS_SDK_URL",
    "NEXT_PUBLIC_ADS_POPUP_FALLBACK",
    "NEXT_PUBLIC_ADS_INAPP_ENABLED",
    "NEXT_PUBLIC_ADS_INAPP_FREQUENCY",
    "NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS",
    "NEXT_PUBLIC_ADS_INAPP_INTERVAL",
    "NEXT_PUBLIC_ADS_INAPP_TIMEOUT",
    "NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE",
  ];
  const missingLiterals = publicVars.filter((name) => !sharedSource.includes(`process.env.${name}`));
  check("every public env var is referenced literally (inlined into the client bundle)", missingLiterals.length === 0, missingLiterals.join(", "));

  /* ------------------------------------------------------------- policy ---- */
  console.log("\nServer policy (throwaway SQLite)");
  const db = await load<typeof import("../src/lib/db")>("../src/lib/db.ts");
  const seed = await load<{ seedCatalog: () => Promise<unknown> }>("./seed-catalog.ts");
  const ads = await load<typeof import("../src/lib/ads")>("../src/lib/ads.ts");

  await db.ensureSchema();
  await seed.seedCatalog();

  const policy = ads.adsPolicy();
  check("policy read from env", policy.rewardMinutes === 5 && policy.dailyLimit === 2 && policy.cooldownSeconds === 0);

  const games = await db.all<{ id: string; slug: string; pricing_type: string }>(
    "SELECT id, slug, pricing_type FROM games WHERE pricing_type = 'premium' ORDER BY slug",
  );
  check("premium games available for the test", games.length >= 3, games.map((g) => g.slug).join(", "));

  const now = new Date().toISOString();
  const userId = "ads-check-user";
  await db.run(
    "INSERT INTO users (id, telegram_id, first_name, language, created_at, updated_at) VALUES (?, ?, 'Ads', 'en', ?, ?)",
    [userId, "999000111", now, now],
  );

  const first = await ads.grantAdUnlock(userId, games[0].id);
  check("first unlock grants a pass", first.ok === true && first.reused === false && first.remaining === 1);
  const passMinutes =
    first.ok ? Math.round((new Date(first.pass.expires_at).getTime() - Date.now()) / 60_000) : 0;
  check("pass length follows ADS_REWARD_MINUTES", passMinutes >= 4 && passMinutes <= 5, `${passMinutes} min`);

  const again = await ads.grantAdUnlock(userId, games[0].id);
  check("same game reuses the pass instead of burning another ad", again.ok === true && again.reused === true);

  const second = await ads.grantAdUnlock(userId, games[1].id);
  check("second premium game grants a second pass", second.ok === true && second.reused === false && second.remaining === 0);

  const third = await ads.grantAdUnlock(userId, games[2].id);
  check("daily cap refuses the third unlock", third.ok === false && third.reason === "limit_reached");

  check("gate opens for a granted game", (await ads.canPlayPremiumGame(userId, games[0].id, false)) === true);
  check("gate stays closed for an ungranted game", (await ads.canPlayPremiumGame(userId, games[2].id, false)) === false);
  check("subscribers bypass the ad gate", (await ads.canPlayPremiumGame(userId, games[2].id, true)) === true);

  // Expiry: backdate the pass and the gate must close again.
  await db.run("UPDATE ad_reward_passes SET expires_at = ? WHERE user_id = ?", [
    new Date(Date.now() - 60_000).toISOString(),
    userId,
  ]);
  check("expired passes stop granting access", (await ads.activeAdPass(userId, games[0].id)) === null);
  check("expired pass closes the gate", (await ads.canPlayPremiumGame(userId, games[0].id, false)) === false);

  // Cooldown, on a fresh user (so the cap is not the blocker).
  process.env.ADS_COOLDOWN_SECONDS = "60";
  const cooledUser = "ads-check-cooldown";
  await db.run(
    "INSERT INTO users (id, telegram_id, first_name, language, created_at, updated_at) VALUES (?, ?, 'Cool', 'en', ?, ?)",
    [cooledUser, "999000222", now, now],
  );
  await ads.grantAdUnlock(cooledUser, games[0].id);
  const blocked = await ads.grantAdUnlock(cooledUser, games[1].id);
  check("cooldown blocks back-to-back unlocks", blocked.ok === false && blocked.reason === "cooldown", `${blocked.ok === false ? blocked.retryAfterSeconds : ""}s`);
  process.env.ADS_COOLDOWN_SECONDS = "0";

  const stats = await ads.adUnlockStats();
  // 3 passes exist by now: two for the first user, one for the cooldown user.
  check(
    "stats count today's unlocks and distinct users",
    stats.unlocks24h === 3 && stats.users24h === 2,
    JSON.stringify({ unlocks: stats.unlocks24h, users: stats.users24h }),
  );

  const disabled = await ads.grantAdUnlock(userId, games[0].id, {
    policy: { ...ads.adsPolicy(), enabled: false },
  });
  check("disabled provider refuses grants", disabled.ok === false && disabled.reason === "disabled");

  /* ------------------------------------------------------------- browser --- */
  console.log("\nBrowser wrapper (synthetic Monetag SDK in jsdom)");
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "https://playnix.test/" });
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.window = dom.window;
  globals.document = dom.window.document;

  const monetag = await load<typeof import("../src/components/ads/monetag")>("../src/components/ads/monetag.ts");
  const config = shared.adsPublicConfig();
  const calls: Array<{ format: unknown }> = [];

  (dom.window as unknown as Record<string, unknown>).show_12207042 = (format?: unknown) => {
    calls.push({ format });
    return Promise.resolve(true);
  };
  const rewarded = await monetag.showRewardedAd(config);
  check("rewarded interstitial resolves", rewarded.format === "interstitial" && calls.length === 1);

  // First format fails → the popup fallback must be used.
  calls.length = 0;
  let attempts = 0;
  (dom.window as unknown as Record<string, unknown>).show_12207042 = (format?: unknown) => {
    attempts += 1;
    calls.push({ format });
    if (format === "pop") return Promise.resolve(true);
    return Promise.reject(new Error("no fill"));
  };
  const fallback = await monetag.showRewardedAd(config);
  check("popup fallback after a failed interstitial", fallback.format === "popup" && attempts === 2, calls.map((c) => String(c.format)).join(" → "));

  // A provider that never resolves must time out, not hang the UI.
  calls.length = 0;
  (dom.window as unknown as Record<string, unknown>).show_12207042 = () => new Promise(() => undefined);
  const timedOut = await monetag
    .showRewardedAd({ ...config, popupFallback: false }, { timeoutMs: 120 })
    .then(() => false)
    .catch((error: Error) => error.name === "AdUnavailableError");
  check("stuck ad times out", timedOut === true);

  // In-app interstitial passes the documented settings verbatim.
  calls.length = 0;
  (dom.window as unknown as Record<string, unknown>).show_12207042 = (format?: unknown) => {
    calls.push({ format });
    return Promise.resolve(true);
  };
  const inAppOff = await monetag.startInAppInterstitial(config);
  check("in-app interstitial is off unless enabled", inAppOff === false && calls.length === 0);
  const started = await monetag.startInAppInterstitial({ ...config, inApp: { ...config.inApp, enabled: true } });
  const payload = calls[0]?.format as { type?: string; inAppSettings?: Record<string, unknown> } | undefined;
  check(
    "in-app interstitial sends frequency/capping/interval/timeout/everyPage",
    started === true &&
      payload?.type === "inApp" &&
      payload.inAppSettings?.frequency === config.inApp.frequency &&
      payload.inAppSettings?.capping === config.inApp.cappingHours &&
      payload.inAppSettings?.interval === config.inApp.intervalSeconds &&
      payload.inAppSettings?.timeout === config.inApp.timeoutSeconds &&
      payload.inAppSettings?.everyPage === config.inApp.everyPage,
    JSON.stringify(payload?.inAppSettings),
  );

  // Live (no-click) ads: in-app first, plain interstitial as the fallback.
  calls.length = 0;
  (dom.window as unknown as Record<string, unknown>).show_12207042 = (format?: unknown) => {
    calls.push({ format });
    return Promise.resolve(true);
  };
  const autoInApp = await monetag.startAutoAd({ ...config, inApp: { ...config.inApp, enabled: true } });
  check(
    "auto ad uses the in-app interstitial first",
    autoInApp.shown === true && autoInApp.format === "inApp" &&
      (calls[0]?.format as { type?: string } | undefined)?.type === "inApp",
  );

  calls.length = 0;
  (dom.window as unknown as Record<string, unknown>).show_12207042 = (format?: unknown) => {
    calls.push({ format });
    if (format && typeof format === "object") return Promise.reject(new Error("no inApp for this zone"));
    return Promise.resolve(true);
  };
  const autoPlain = await monetag.startAutoAd(config);
  check(
    "auto ad falls back to the fullscreen interstitial",
    autoPlain.shown === true && autoPlain.format === "interstitial" && calls.length === 2,
    calls.map((c) => (typeof c.format === "object" ? "inApp" : "plain")).join(" → "),
  );

  (dom.window as unknown as Record<string, unknown>).show_12207042 = () => Promise.reject(new Error("no fill"));
  const autoFailed = await monetag.startAutoAd(config);
  check("auto ad reports failure instead of throwing", autoFailed.shown === false);

  const monetagSource = fs.readFileSync(path.join(process.cwd(), "src", "components", "ads", "monetag.ts"), "utf8");
  check(
    "SDK tag carries data-zone/data-sdk (Monetag in-app requires it)",
    monetagSource.includes("dataset.zone") && monetagSource.includes("dataset.sdk"),
  );

  const blockedInJsdom = await (async () => {
    delete (dom.window as unknown as Record<string, unknown>).show_12207042;
    const mod = await load<typeof import("../src/components/ads/monetag")>("../src/components/ads/monetag.ts");
    return mod.startInAppInterstitial({ ...config, inApp: { ...config.inApp, enabled: true } });
  })();
  check("missing SDK degrades gracefully", blockedInJsdom === false);

  /* -------------------------------------------------------------- result --- */
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(dbFile + suffix);
    } catch {
      /* nothing to clean */
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} ads check(s) failed.`);
    process.exit(1);
  }
  console.log("\nRewarded-ads checks passed.");
}

main().catch((error) => {
  console.error("ads check crashed:", error);
  process.exit(1);
});
