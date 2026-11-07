/**
 * End-to-end check of the subscription funnel inside the bot, without touching
 * Telegram: `fetch` is intercepted so every Bot API call is recorded instead of
 * sent.
 *
 *   npx tsx scripts/check-bot.ts
 *
 * Verifies that
 *   1. /start answers with the branded photo + the "subscribe" button,
 *   2. the subscribe button lists every plan with a buy button,
 *   3. tapping a plan mints a Stars invoice and replies with a pay button,
 *   4. the welcome text/photo survives a Telegram failure (text fallback).
 */
import fs from "node:fs";
import path from "node:path";

const dbFile = path.join(process.cwd(), "data", "check-bot.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  try { fs.unlinkSync(dbFile + suffix); } catch {}
}

process.env.SQLITE_PATH = dbFile;
process.env.TELEGRAM_BOT_TOKEN = "123456:TEST-TOKEN";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
process.env.NEXT_PUBLIC_APP_URL = "https://playnix.test";

type Call = { method: string; body: Record<string, unknown> };
const calls: Call[] = [];
let failPhotos = false;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const match = url.match(/api\.telegram\.org\/bot[^/]+\/([^?]+)/);
  if (!match) return realFetch(input as never, init);
  const method = match[1];
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  calls.push({ method, body });

  if (method === "sendPhoto" && failPhotos) {
    return new Response(JSON.stringify({ ok: false, description: "Bad Request: wrong file identifier/HTTP URL specified" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const result =
    method === "createInvoiceLink" ? "https://t.me/$test-invoice-link" : method === "getMe" ? { id: 1, username: "PlaynixTestBot", first_name: "Playnix" } : true;
  return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

async function main() {
const { ensureSchema, all } = await import("../src/lib/db");
const { seedCatalog } = await import("./seed-catalog");
const { handleUpdate } = await import("../src/lib/bot");

await ensureSchema();
await seedCatalog();

const CHAT = 8506161202;
const FROM = { id: CHAT, first_name: "Tester", username: "tester", language_code: "ar" };
let updateId = 1;

async function send(text: string) {
  await handleUpdate({ update_id: updateId++, message: { message_id: updateId, from: FROM, chat: { id: CHAT }, text } } as never);
}
async function press(data: string) {
  await handleUpdate({ update_id: updateId++, callback_query: { id: `cb${updateId}`, from: FROM, data, message: { chat: { id: CHAT } } } } as never);
}

function since(mark: number) { return calls.slice(mark); }
function fail(message: string): never { console.error(`✗ ${message}`); process.exitCode = 1; throw new Error(message); }

// 1. /start
let mark = calls.length;
await send("/start");
let batch = since(mark);
const photo = batch.find((call) => call.method === "sendPhoto");
if (!photo) fail("/start did not send a photo");
if (!String(photo.body.photo).endsWith("/brand/welcome.jpg")) fail(`wrong photo url: ${photo.body.photo}`);
const startKeyboard = JSON.stringify(photo.body.reply_markup);
if (!startKeyboard.includes("premium:plans")) fail("welcome keyboard has no subscribe button");
if (!startKeyboard.includes("web_app")) fail("welcome keyboard has no mini app button");
console.log("✓ /start sends the branded photo + subscribe button");

// 2. subscribe button
mark = calls.length;
await press("premium:plans");
batch = since(mark);
const plansMessage = batch.find((call) => call.method === "sendMessage");
if (!plansMessage) fail("subscribe button produced no message");
const planButtons = [...String(JSON.stringify(plansMessage.body.reply_markup)).matchAll(/buy:([0-9a-f-]{36})/g)];
const planRows = await all<{ id: string }>("SELECT id FROM plans WHERE status = 'active'");
if (planButtons.length !== planRows.length) fail(`expected ${planRows.length} buy buttons, got ${planButtons.length}`);
if (!batch.some((call) => call.method === "answerCallbackQuery")) fail("callback was not answered");
console.log(`✓ subscribe lists all ${planRows.length} plans with buy buttons`);

// 3. buy a plan
mark = calls.length;
await press(`buy:${planRows[0].id}`);
batch = since(mark);
const invoice = batch.find((call) => call.method === "createInvoiceLink");
if (!invoice) fail("no Stars invoice was created");
if (invoice.body.currency !== "XTR") fail(`invoice currency is ${invoice.body.currency}`);
const payMessage = batch.find((call) => call.method === "sendMessage" && String(JSON.stringify(call.body.reply_markup)).includes("t.me/$"));
if (!payMessage) fail("no pay button message");
const pending = await all<{ status: string }>("SELECT status FROM payments");
if (!pending.some((row) => row.status === "pending")) fail("no pending payment row was stored");
console.log(`✓ plan purchase mints an XTR invoice (${invoice.body.currency}, ${JSON.stringify(invoice.body.prices)}) and a pay button`);

// 4. graceful fallback when Telegram rejects the photo
failPhotos = true;
mark = calls.length;
await send("/start");
batch = since(mark);
if (!batch.some((call) => call.method === "sendPhoto")) fail("fallback test never tried the photo");
const fallbackText = batch.find((call) => call.method === "sendMessage");
if (!fallbackText) fail("no text fallback after the photo failed");
if (!String(fallbackText.body.text).includes("بلاينكس")) fail("fallback text is not the Arabic welcome");
console.log("✓ photo failure falls back to a text welcome");
failPhotos = false;

// 5. deploy-time wiring: webhook, menu button, command list
const { getMe, setWebhook, setChatMenuButton, setMyCommands } = await import("../src/lib/telegram");
mark = calls.length;
const me = await getMe();
await setWebhook("https://playnix.test/api/telegram/webhook", "test-secret");
await setChatMenuButton("https://playnix.test", "Play now");
await setMyCommands([
  { command: "start", description: "ابدأ اللعب" },
  { command: "subscribe", description: "اشترك في بريميوم" },
]);
batch = since(mark);
if (!me?.username) fail("getMe returned no username");
const webhook = batch.find((call) => call.method === "setWebhook");
if (!webhook) fail("setWebhook was not called");
if (webhook.body.url !== "https://playnix.test/api/telegram/webhook") fail(`wrong webhook url: ${webhook.body.url}`);
if (webhook.body.secret_token !== "test-secret") fail("webhook is registered without its secret token");
if (!JSON.stringify(webhook.body.allowed_updates).includes("callback_query")) fail("callback updates are not allowed");
const menu = batch.find((call) => call.method === "setChatMenuButton");
if (!menu) fail("setChatMenuButton was not called");
if ((menu.body.menu_button as { web_app?: { url?: string } })?.web_app?.url !== "https://playnix.test") fail("menu button does not open the app");
const commands = batch.find((call) => call.method === "setMyCommands");
if (!commands) fail("setMyCommands was not called");
if ((commands.body.commands as unknown[])?.length !== 2) fail("command list was not published as sent");
console.log("✓ webhook, menu button and command list are wired through the SDK client");

console.log("\nBot subscription funnel OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
