/**
 * Server-side example: sign a Mini App user in from `initData`, then read their
 * premium status and start a tracked play session.
 *
 *   PLAYnix_BASE=https://playnix-ashen.vercel.app \
 *   TELEGRAM_BOT_TOKEN=… \
 *   node examples/node-client.mjs "<initData>"
 */
import { PlaynixClient } from "../dist/esm/index.js";
import { validateInitData } from "../dist/esm/server/index.js";

const baseUrl = process.env.PLAYNIX_BASE ?? "http://localhost:3000";
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const initData = process.argv[2];

if (!initData) {
  console.error("usage: node examples/node-client.mjs \"<initData>\"");
  process.exit(1);
}

const { user, startParam } = validateInitData(initData, { botToken });
console.log(`Telegram user: ${user.first_name} (${user.id}) — start_param: ${startParam ?? "none"}`);

const playnix = new PlaynixClient({ baseUrl, locale: "ar" });
await playnix.signIn(initData);
console.log(`session cookie stored: ${Boolean(playnix.sessionCookie)}`);

const [me, plans, games] = await Promise.all([
  playnix.me(),
  playnix.listPlans(),
  playnix.listGames({ sort: "newest", limit: 5 }),
]);

console.log(`premium: ${me.premium}${me.subscription ? ` until ${me.subscription.expiresAt}` : ""}`);
console.log(`plans: ${plans.plans.map((plan) => `${plan.name} — ${plan.price} XTR`).join(" | ")}`);
console.log(`latest games: ${games.games.map((game) => game.title).join(", ")}`);

const premiumGame = games.games.find((game) => game.pricingType === "premium");
if (premiumGame) {
  try {
    const session = await playnix.startPlaySession(premiumGame.id);
    console.log(`play session: ${session.sessionId}`);
    await playnix.endPlaySession(session.sessionId, 30_000);
  } catch (error) {
    console.log(`premium gate: ${error.code} (${error.message})`);
  }
}
