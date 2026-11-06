/**
 * Playnix acceptance smoke test.
 *
 * Covers the parts that must be provably real:
 *  - database schema, seed data and catalog integrity
 *  - Telegram initData signature validation (positive + tamper cases)
 *  - search relevance and empty-result behaviour
 *  - Telegram Stars fulfilment (server-side, idempotent)
 *  - HTTP surface, security headers and premium gating (needs a running server)
 *
 * Usage: npm run smoke            (server on http://127.0.0.1:3000)
 *        BASE_URL=https://… npm run smoke
 */
import crypto from "node:crypto";
import { all, ensureSchema, one, run } from "../src/lib/db";
import { env } from "../src/lib/env";
import { searchGames } from "../src/lib/games";
import { fulfilStarsPayment } from "../src/lib/payments";
import { nowIso } from "../src/lib/time";
import { validateInitData } from "../src/lib/telegram";
import { verifyGameUrl } from "../src/lib/verify-game";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function signInitData(params: Record<string, string>, token: string): string {
  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const url = new URLSearchParams({ ...params, hash });
  return url.toString();
}

async function main() {
  await ensureSchema();

  section("Database & catalog");
  const tables = await all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  ).catch(async () => all<{ name: string }>("SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'"));
  check("schema has 20+ tables", tables.length >= 20, `${tables.length} tables`);

  const games = await all<{ title: string; slug: string; game_url: string | null; game_type: string; pricing_type: string; publication_status: string }>(
    "SELECT title, slug, game_url, game_type, pricing_type, publication_status FROM games",
  );
  check("catalog seeded with 5+ games", games.length >= 5, `${games.length} games`);
  const published = games.filter((game) => game.publication_status === "published");
  check("all published games expose a launch URL", published.every((game) => Boolean(game.game_url)));
  check("every published slug is unique", new Set(games.map((game) => game.slug)).size === games.length);
  check("at least one premium game exists", games.some((game) => game.pricing_type === "premium"));

  const categories = await all("SELECT id FROM categories");
  check("categories seeded", categories.length >= 16, `${categories.length} categories`);
  const plans = await all<{ price: number }>("SELECT price FROM plans WHERE status = 'active'");
  check("premium plans exist with Stars prices", plans.length > 0 && plans.every((plan) => Number(plan.price) > 0));

  section("Game verification (real launch checks)");
  let verified = 0;
  for (const game of published) {
    if (game.game_type !== "html5" || !game.game_url) continue;
    const result = await verifyGameUrl(game.game_url);
    if (result.ok) verified += 1;
    else console.log(`        ${game.title}: ${result.checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}`);
  }
  check("five or more HTML5 games pass verification", verified >= 5, `${verified} verified`);

  section("Telegram initData authentication");
  if (!env.botToken) {
    check("initData validation", false, "TELEGRAM_BOT_TOKEN missing (skipped)");
  } else {
    const params = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      query_id: "AAExampleQuery",
      user: JSON.stringify({ id: 424242, first_name: "Smoke", username: "smoke_tester", language_code: "en" }),
    };
    const valid = signInitData(params, env.botToken);
    let accepted = false;
    try {
      const parsed = validateInitData(valid);
      accepted = parsed.user.id === 424242;
    } catch (error) {
      console.log(`        ${(error as Error).message}`);
    }
    check("valid initData signature accepted", accepted);

    const tampered = valid.replace("Smoke", "Hacker");
    let rejected = false;
    try {
      validateInitData(tampered);
    } catch {
      rejected = true;
    }
    check("tampered initData rejected", rejected);

    const oldParams = { ...params, auth_date: String(Math.floor(Date.now() / 1000) - 60 * 60 * 48) };
    let expiredRejected = false;
    try {
      validateInitData(signInitData(oldParams, env.botToken));
    } catch {
      expiredRejected = true;
    }
    check("expired initData rejected", expiredRejected);
  }

  section("Search engine");
  const hit = await searchGames({ query: "serpent" });
  check("partial name search finds the game", hit.games.some((game) => game.slug === "neon-serpent"), `${hit.total} result(s)`);
  const keyword = await searchGames({ query: "asteroid" });
  check("keyword search reaches description text", keyword.games.some((game) => game.slug === "astro-dodge"));
  const miss = await searchGames({ query: "zzz-no-such-game-zzz" });
  check("unknown query returns zero rows (no invented results)", miss.total === 0);
  const categoryFiltered = await searchGames({ category: "board-games" });
  check("category filter works", categoryFiltered.games.every((game) => game.category_slug === "board-games"));
  const premiumOnly = await searchGames({ pricing: "premium" });
  check("premium filter works", premiumOnly.games.every((game) => game.pricing_type === "premium"));

  section("Telegram Stars fulfilment (server-side)");
  const plan = await one<{ id: string; duration_days: number; price: number }>(
    "SELECT id, duration_days, price FROM plans WHERE status = 'active' ORDER BY price ASC LIMIT 1",
  );
  if (!plan) {
    check("plan available", false);
  } else {
    const userId = crypto.randomUUID();
    const telegramId = `smoke-${Date.now()}`;
    await run(
      `INSERT INTO users (id, telegram_id, first_name, language, role, status, created_at, updated_at)
       VALUES (?, ?, 'Smoke Test', 'en', 'user', 'active', ?, ?)`,
      [userId, telegramId, nowIso(), nowIso()],
    );
    const payload = `${plan.id}:${userId}:smoke`;
    await run(
      `INSERT INTO payments (id, user_id, plan_id, provider, transaction_id, payload, amount, currency, status, created_at, updated_at)
       VALUES (?, ?, ?, 'telegram_stars', ?, ?, ?, 'XTR', 'pending', ?, ?)`,
      [crypto.randomUUID(), userId, plan.id, payload, payload, plan.price, nowIso(), nowIso()],
    );

    const first = await fulfilStarsPayment({ payload, chargeId: "smoke-charge", amount: Number(plan.price), currency: "XTR" });
    check("verified payment activates premium", first.ok && !first.alreadyProcessed);
    const subscription = await one<{ status: string; expires_at: string }>(
      "SELECT status, expires_at FROM subscriptions WHERE user_id = ?",
      [userId],
    );
    check("subscription row created with an expiry", Boolean(subscription && subscription.status === "active" && subscription.expires_at));

    const second = await fulfilStarsPayment({ payload, chargeId: "smoke-charge", amount: Number(plan.price), currency: "XTR" });
    const activeCount = await one<{ total: unknown }>(
      "SELECT COUNT(*) AS total FROM subscriptions WHERE user_id = ?",
      [userId],
    );
    check("replayed payment is idempotent", Boolean(second.ok && second.alreadyProcessed && Number(activeCount?.total) === 1));

    const mismatch = await fulfilStarsPayment({ payload: `${plan.id}:${userId}:other`, chargeId: "x", amount: 1, currency: "XTR" });
    check("unknown invoice payload is rejected", mismatch.ok === false);

    await run("DELETE FROM subscriptions WHERE user_id = ?", [userId]);
    await run("DELETE FROM payments WHERE user_id = ?", [userId]);
    await run("DELETE FROM users WHERE id = ?", [userId]);
  }

  section("HTTP surface");
  const headers = ["content-security-policy", "x-content-type-options", "referrer-policy"];
  // Production locks framing to Telegram; the dev preview must stay embeddable.
  if (process.env.NODE_ENV === "production") headers.push("x-frame-options");
  try {
    const home = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    const html = await home.text();
    check("homepage responds 200", home.status === 200, `${home.status}`);
    check("homepage renders brand + real game cards", html.includes("Playnix") && html.includes("Neon Serpent"));
    const missingHeaders = headers.filter((header) => !home.headers.get(header));
    check("security headers present", missingHeaders.length === 0, missingHeaders.join(", "));

    const api = await fetch(`${BASE_URL}/api/games?limit=3`);
    const apiJson = (await api.json()) as { games?: unknown[]; total?: number };
    check("GET /api/games returns catalog data", api.status === 200 && Array.isArray(apiJson.games));

    const detail = await fetch(`${BASE_URL}/game/neon-serpent`);
    check("game details page responds 200", detail.status === 200);

    const player = await fetch(`${BASE_URL}/play/neon-serpent`, { redirect: "manual" });
    check("free game player renders", player.status === 200);

    const locked = await fetch(`${BASE_URL}/play/reversi-duel`, { redirect: "manual" });
    check("premium game is gated server-side", locked.status >= 300 && locked.status < 400, `${locked.status} → ${locked.headers.get("location")}`);

    const unknown = await fetch(`${BASE_URL}/game/does-not-exist`);
    check("unknown game returns 404", unknown.status === 404);

    const admin = await fetch(`${BASE_URL}/admin`);
    const adminHtml = await admin.text();
    check(
      "admin dashboard is not public",
      admin.status === 200 && !adminHtml.includes('href="/admin/games"') && !adminHtml.includes('href="/admin/users"'),
    );

    const unauthorized = await fetch(`${BASE_URL}/api/admin/dashboard`);
    check("admin API rejects anonymous callers", unauthorized.status === 401, `${unauthorized.status}`);

    const review = await fetch(`${BASE_URL}/api/games/neon-serpent/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, reviewText: "should fail" }),
    });
    check("reviews require authentication", review.status === 401, `${review.status}`);

    const crossOrigin = await fetch(`${BASE_URL}/api/users/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ gameId: "00000000-0000-4000-a000-000000000000" }),
    });
    check("cross-origin writes rejected", crossOrigin.status === 401 || crossOrigin.status === 403, `${crossOrigin.status}`);

    for (const slug of ["neon-serpent", "void-breaker", "astro-dodge", "block-cascade", "memory-matrix", "reversi-duel"]) {
      const game = await fetch(`${BASE_URL}/games/${slug}/index.html`);
      check(`game bundle served: ${slug}`, game.status === 200, `${game.status}`);
    }
  } catch (error) {
    check("HTTP surface reachable", false, error instanceof Error ? error.message : "server not running");
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log(`Failures: ${failures.join(" | ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
