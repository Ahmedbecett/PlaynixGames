/**
 * Contract tests for the published artifact (dist/esm). Run with:
 *
 *   cd sdk && npm run build && npm test
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  PlaynixClient,
  PlaynixError,
  normaliseBotUsername,
  startAppLink,
  resolveStartParam,
  shareGameLink,
  gameStartParam,
  getWebApp,
  initMiniApp,
  haptic,
  isTelegram,
  openInvoice,
  startParam,
} from "../dist/esm/index.js";

import {
  TelegramBot,
  TelegramApiError,
  computeInitDataHash,
  validateInitData,
  parseInitData,
  buildDataCheckString,
  createWebhookHandler,
  verifyWebhookSecret,
  isSuccessfulPayment,
  parseStarsPayment,
  parseCommand,
  SECRET_HEADER,
} from "../dist/esm/server/index.js";

const TOKEN = "123456:TEST-TOKEN-abcdefghijklmnop";

/** Builds `initData` the way Telegram does, so validation can be exercised. */
function makeInitData({ user = { id: 42, first_name: "Ada", username: "ada", language_code: "ar" }, authDate = Math.floor(Date.now() / 1000), extra = {} } = {}) {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAH-test-query");
  params.set("user", JSON.stringify(user));
  params.set("start_param", "game_tower-guard");
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  const hash = computeInitDataHash(TOKEN, params);
  params.set("hash", hash);
  return params.toString();
}

/* ------------------------------------------------------------------ links -- */

test("bot username normalisation mirrors the app", () => {
  assert.equal(normaliseBotUsername("@PlaynixGamesBot"), "PlaynixGamesBot");
  assert.equal(normaliseBotUsername(" PlaynixBot "), "PlaynixBot");
  assert.equal(normaliseBotUsername("bad name"), null);
  assert.equal(normaliseBotUsername("abc"), null);
  assert.equal(normaliseBotUsername(undefined), null);
});

test("startapp links encode the payload", () => {
  assert.equal(startAppLink("@PlaynixGamesBot"), "https://t.me/PlaynixGamesBot");
  assert.equal(startAppLink("PlaynixGamesBot", "premium"), "https://t.me/PlaynixGamesBot?startapp=premium");
  assert.equal(startAppLink("PlaynixGamesBot", gameStartParam("card-blitz")), "https://t.me/PlaynixGamesBot?startapp=game_card-blitz");
  assert.equal(startAppLink("PlaynixGamesBot", "search_neon dodge"), "https://t.me/PlaynixGamesBot?startapp=search_neon%20dodge");
  assert.equal(startAppLink("no"), null);
  assert.equal(startAppLink("bad name"), null);
});

test("start_param resolves to in-app routes", () => {
  assert.equal(resolveStartParam("game_tower-guard"), "/game/tower-guard");
  assert.equal(resolveStartParam("play_tower-guard"), "/play/tower-guard");
  assert.equal(resolveStartParam("cat_casual"), "/category/casual");
  assert.equal(resolveStartParam("search_neon"), "/search?q=neon");
  assert.equal(resolveStartParam("premium"), "/premium");
  assert.equal(resolveStartParam("new"), "/search?sort=newest");
  assert.equal(resolveStartParam("favorites"), "/favorites");
  assert.equal(resolveStartParam("game_../../etc/passwd"), null);
  assert.equal(resolveStartParam(""), null);
});

test("share links point at the Mini App", () => {
  const link = shareGameLink({ botUsername: "PlaynixGamesBot", slug: "card-blitz", title: "Card Blitz" });
  const url = new URL(link);
  assert.equal(url.origin, "https://t.me");
  assert.equal(url.searchParams.get("url"), "https://t.me/PlaynixGamesBot?startapp=game_card-blitz");
  assert.equal(url.searchParams.get("text"), "Card Blitz");
});

/* --------------------------------------------------------------- mini app -- */

test("mini app helpers are SSR safe", async () => {
  assert.equal(getWebApp(), null);
  assert.equal(isTelegram(), false);
  assert.equal(initMiniApp(), false);
  assert.equal(startParam(), null);
  assert.equal(await openInvoice("https://t.me/$x"), false);
  assert.doesNotThrow(() => haptic("heavy"));
});

/* --------------------------------------------------------------- initData -- */

test("initData validates with the bot token", () => {
  const initData = makeInitData();
  const result = validateInitData(initData, { botToken: TOKEN });
  assert.equal(result.user.id, 42);
  assert.equal(result.user.first_name, "Ada");
  assert.equal(result.startParam, "game_tower-guard");
  assert.equal(result.queryId, "AAH-test-query");
  assert.ok(result.authDate instanceof Date);
  assert.equal(result.raw, initData);
});

test("initData data_check_string is sorted and skips hash/signature", () => {
  const params = new URLSearchParams("b=2&a=1&hash=deadbeef&signature=xyz");
  assert.equal(buildDataCheckString(params), "a=1\nb=2");
});

test("tampered initData is rejected", () => {
  const initData = makeInitData();
  const tampered = initData.replace(encodeURIComponent("Ada"), encodeURIComponent("Eve"));
  assert.throws(() => validateInitData(tampered, { botToken: TOKEN }), /signature is invalid/);
});

test("wrong token, missing hash and expiry all fail loudly", () => {
  const initData = makeInitData();
  assert.throws(() => validateInitData(initData, { botToken: "999:other" }), /signature is invalid/);
  assert.throws(() => validateInitData("user=%7B%7D", { botToken: TOKEN }), /Missing initData hash/);
  assert.throws(() => validateInitData(initData, { botToken: undefined }), /Bot token is not configured/);

  const old = makeInitData({ authDate: Math.floor(Date.now() / 1000) - 60 * 60 * 48 });
  assert.throws(() => validateInitData(old, { botToken: TOKEN }), /expired/);
  assert.doesNotThrow(() => validateInitData(old, { botToken: TOKEN, maxAgeSeconds: 60 * 60 * 72 }));
});

test("parseInitData does not verify the signature", () => {
  const params = new URLSearchParams({ auth_date: "1700000000", user: JSON.stringify({ id: 7, first_name: "Solo" }) });
  const parsed = parseInitData(params.toString());
  assert.equal(parsed.user.id, 7);
  assert.equal(parsed.authDate.toISOString(), new Date(1700000000 * 1000).toISOString());
});

/* ---------------------------------------------------------------- webhook -- */

const update = (id = 1) => ({
  update_id: id,
  message: { message_id: id, from: { id: 42, first_name: "Ada" }, chat: { id: 42 }, text: "/start" },
});

test("webhook rejects the wrong secret", async () => {
  const handler = createWebhookHandler({ secret: "s3cret", onUpdate: () => undefined });
  const response = await handler(
    new Request("https://example.test/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify(update()),
      headers: { "content-type": "application/json", [SECRET_HEADER]: "wrong" },
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(verifyWebhookSecret("abc", "abc"), true);
  assert.equal(verifyWebhookSecret("abc", "abcd"), false);
  assert.equal(verifyWebhookSecret(null, "abc"), false);
});

test("webhook invokes onUpdate and acknowledges", async () => {
  const received = [];
  const handler = createWebhookHandler({ secret: "s3cret", onUpdate: (u) => { received.push(u.update_id); } });
  const response = await handler(
    new Request("https://example.test/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify(update(9)),
      headers: { [SECRET_HEADER]: "s3cret" },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(received, [9]);
});

test("webhook rejects malformed bodies and de-duplicates updates", async () => {
  const handler = createWebhookHandler({ secret: "s3cret", onUpdate: () => undefined, dedupe: true });
  const bad = await handler(new Request("https://x.test/h", { method: "POST", body: "not json", headers: { [SECRET_HEADER]: "s3cret" } }));
  assert.equal(bad.status, 400);

  const first = await handler(new Request("https://x.test/h", { method: "POST", body: JSON.stringify(update(5)), headers: { [SECRET_HEADER]: "s3cret" } }));
  const second = await handler(new Request("https://x.test/h", { method: "POST", body: JSON.stringify(update(5)), headers: { [SECRET_HEADER]: "s3cret" } }));
  assert.equal(first.status, 200);
  assert.deepEqual(await second.json(), { ok: true, duplicate: true });
});

test("webhook swallows handler errors by default and can opt into 5xx", async () => {
  const errors = [];
  const silent = createWebhookHandler({
    secret: "s",
    onUpdate: () => { throw new Error("boom"); },
    onError: (error) => { errors.push(error.message); },
  });
  const okResponse = await silent(new Request("https://x.test/h", { method: "POST", body: JSON.stringify(update(3)), headers: { [SECRET_HEADER]: "s" } }));
  assert.equal(okResponse.status, 200);
  assert.deepEqual(errors, ["boom"]);

  const loud = createWebhookHandler({ secret: "s", onUpdate: () => { throw new Error("boom"); }, respondOnError: "error" });
  const failed = await loud(new Request("https://x.test/h", { method: "POST", body: JSON.stringify(update(4)), headers: { [SECRET_HEADER]: "s" } }));
  assert.equal(failed.status, 500);
});

test("payment helpers read Stars updates", () => {
  const paid = {
    update_id: 11,
    message: {
      message_id: 11,
      chat: { id: 42 },
      successful_payment: { invoice_payload: "plan:user:nonce", telegram_payment_charge_id: "ch_1", total_amount: 250, currency: "XTR" },
    },
  };
  assert.equal(isSuccessfulPayment(paid), true);
  assert.equal(parseStarsPayment(paid).invoice_payload, "plan:user:nonce");
  assert.equal(isSuccessfulPayment(update()), false);
  assert.equal(parseStarsPayment(update()), null);
});

test("commands parse with and without a bot suffix", () => {
  assert.deepEqual(parseCommand("/start"), { command: "/start", argument: "" });
  assert.deepEqual(parseCommand("/search@PlaynixGamesBot neon serpent "), { command: "/search", argument: "neon serpent" });
  assert.equal(parseCommand("hello"), null);
});

/* -------------------------------------------------------------- bot api ---- */

function fakeFetch(handler) {
  return async (input, init) => handler(String(input), init);
}

const jsonResponse = (payload, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => payload,
});

test("TelegramBot unwraps results and surfaces API errors", async () => {
  const seen = [];
  const bot = new TelegramBot({
    token: TOKEN,
    fetch: fakeFetch(async (url, init) => {
      seen.push({ url, body: JSON.parse(init.body) });
      if (url.endsWith("/getMe")) return jsonResponse({ ok: true, result: { id: 1, username: "PlaynixBot", first_name: "P" } });
      if (url.endsWith("/sendPhoto")) return jsonResponse({ ok: false, description: "Bad Request: wrong file" }, 400);
      return jsonResponse({ ok: true, result: true });
    }),
  });

  const me = await bot.getMe();
  assert.equal(me.username, "PlaynixBot");
  assert.match(seen[0].url, /^https:\/\/api\.telegram\.org\/bot.+\/getMe$/);

  await assert.rejects(bot.sendPhoto(42, "https://x.test/a.jpg", "hi"), (error) => {
    assert.ok(error instanceof TelegramApiError);
    assert.equal(error.status, 400);
    assert.match(error.message, /wrong file/);
    return true;
  });

  const invoice = [];
  const invoiceBot = new TelegramBot({
    token: TOKEN,
    fetch: fakeFetch(async (url, init) => {
      invoice.push({ url, body: JSON.parse(init.body) });
      return jsonResponse({ ok: true, result: "https://t.me/$invoice" });
    }),
  });
  const link = await invoiceBot.createInvoiceLink({ title: "Premium", description: "30 days", payload: "p1", stars: 250 });
  assert.equal(link, "https://t.me/$invoice");
  assert.equal(invoice[0].body.currency, "XTR");
  assert.deepEqual(invoice[0].body.prices, [{ label: "Premium", amount: 250 }]);
  assert.equal(invoice[0].body.subscription_period, undefined);
});

/* ---------------------------------------------------------------- client --- */

function clientWith(fetchImpl, extra = {}) {
  return new PlaynixClient({ baseUrl: "https://playnix.test/", fetch: fetchImpl, ...extra });
}

test("client builds catalog requests and parses responses", async () => {
  const calls = [];
  const client = clientWith(
    fakeFetch(async (url, init) => {
      calls.push({ url, method: init.method ?? "GET", headers: init.headers, body: init.body });
      if (url.includes("/api/games?")) {
        return jsonResponse({ games: [{ id: "g1", slug: "tower-guard", pricingType: "premium" }], total: 1, limit: 20, offset: 0 });
      }
      return jsonResponse({ ok: true, dialect: "postgres", catalog: { publishedGames: 16 }, integrations: {}, timestamp: "now" });
    }),
  );

  const games = await client.listGames({ pricing: "premium", limit: 20, sort: "newest" });
  assert.equal(games.total, 1);
  assert.equal(games.games[0].slug, "tower-guard");

  const url = new URL(calls[0].url);
  assert.equal(url.origin + url.pathname, "https://playnix.test/api/games");
  assert.equal(url.searchParams.get("pricing"), "premium");
  assert.equal(url.searchParams.get("sort"), "newest");
  assert.equal(url.searchParams.get("limit"), "20");
  assert.equal(calls[0].headers.accept, "application/json");

  const health = await client.health();
  assert.equal(health.ok, true);
});

test("client maps HTTP errors to PlaynixError codes", async () => {
  const client = clientWith(fakeFetch(async () => jsonResponse({ error: { message: "Premium membership is required for this game.", code: "premium_required" } }, 402)));
  await assert.rejects(client.startPlaySession("g1"), (error) => {
    assert.ok(error instanceof PlaynixError);
    assert.equal(error.code, "premium_required");
    assert.equal(error.status, 402);
    assert.equal(error.retryable, false);
    return true;
  });

  const limited = clientWith(fakeFetch(async () => jsonResponse({ error: { message: "slow down", code: "rate_limited" } }, 429)));
  await assert.rejects(limited.listGames(), (error) => error.retryable === true);
});

test("client keeps the session cookie returned by sign-in", async () => {
  const client = clientWith(
    fakeFetch(async (url, init) => {
      if (url.endsWith("/api/auth/telegram")) {
        assert.equal(init.method, "POST");
        assert.equal(init.headers.origin, "https://playnix.test");
        assert.deepEqual(JSON.parse(init.body), { initData: "auth_date=1&hash=abc" });
        return jsonResponse({ user: { id: "u1", firstName: "Ada" }, created: true }, 200, {
          "set-cookie": "playnix_session=signed.token.value; Path=/; HttpOnly; SameSite=Lax",
        });
      }
      assert.equal(client.sessionCookie, "playnix_session=signed.token.value");
      return jsonResponse({ user: { id: "u1" }, premium: false, subscription: null, stats: { gamesPlayed: 0, favorites: 0, totalPlayMs: 0 } });
    }),
  );

  const session = await client.signIn("auth_date=1&hash=abc");
  assert.equal(session.created, true);
  assert.equal(client.sessionCookie, "playnix_session=signed.token.value");

  const me = await client.me();
  assert.equal(me.premium, false);
});

test("client reports timeouts and network failures distinctly", async () => {
  const hanging = clientWith(
    () => new Promise((_, reject) => { setTimeout(() => reject(new Error("aborted")), 5); }),
    { timeoutMs: 1000 },
  );
  await assert.rejects(hanging.health(), (error) => error.code === "network_error" && error.retryable === true);

  const slow = clientWith(
    (_input, init) => new Promise((_, reject) => { init.signal.addEventListener("abort", () => reject(new Error("aborted"))); }),
    { timeoutMs: 10 },
  );
  await assert.rejects(slow.health(), (error) => error.code === "timeout");
});
