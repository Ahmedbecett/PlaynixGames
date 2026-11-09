/**
 * Live contract check for `playnix-sdk` against a running Playnix instance.
 *
 *   npm run sdk:build            # produce sdk/dist
 *   npm run dev                  # or point at production
 *   npm run sdk:check            # PLAYNIX_BASE=https://playnix-ashen.vercel.app
 *
 * Fails loudly if the SDK drifts from the API it claims to wrap.
 */
import { PlaynixClient, PlaynixError, resolveStartParam, startAppLink } from "../sdk/dist/esm/index.js";

const baseUrl = process.env.PLAYNIX_BASE ?? "http://localhost:3000";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectCode(label: string, promise: Promise<unknown>, code: string) {
  try {
    await promise;
    check(label, false, "expected an error, got a success");
  } catch (error) {
    const playnixError = error as PlaynixError;
    check(label, playnixError.code === code, `${playnixError.code} (${playnixError.status})`);
  }
}

async function main() {
  console.log(`SDK live check against ${baseUrl}\n`);
  const client = new PlaynixClient({ baseUrl });

  const health = await client.health();
  check("health", health.ok === true, `${health.dialect}, ${health.catalog.publishedGames} published games`);
  check("health.integrations", Array.isArray(health.integrations), `${health.integrations.length} entries`);

  const categories = await client.listCategories();
  check("listCategories", categories.categories.length >= 8, `${categories.categories.length} categories`);

  const games = await client.listGames({ limit: 50 });
  const premium = games.games.filter((game) => game.pricingType === "premium");
  check("listGames", games.total >= 16, `${games.total} games`);
  check("premium gating", premium.length >= 3, `${premium.length} premium: ${premium.map((game) => game.slug).join(", ")}`);

  const free = games.games.find((game) => game.pricingType === "free");
  check("free games exist", Boolean(free), free?.slug);

  const search = await client.search("tower");
  check("search", search.total >= 1, `${search.total} hits, top: ${search.games[0]?.title}`);

  const detail = await client.getGame(premium[0]?.slug ?? "card-blitz");
  check("getGame", Boolean(detail.game.id), `${detail.game.title} (${detail.screenshots.length} screenshots, ${detail.similar.length} similar)`);
  const playable = detail.game.playableUrl ?? "";
  check(
    "playableUrl",
    playable.startsWith("/play/") || playable.startsWith("/games/"),
    `${playable || "null"} (player route: /play/${detail.game.slug})`,
  );

  const plans = await client.listPlans();
  check("listPlans", plans.currency === "XTR" && plans.plans.length >= 3, plans.plans.map((plan) => `${plan.price}⭐/${plan.durationDays}d`).join(" "));

  await expectCode("me() without session", client.me(), "unauthorized");
  await expectCode("createInvoice() without session", client.createInvoice(plans.plans[0].id), "unauthorized");
  await expectCode("startPlaySession() without session", client.startPlaySession(detail.game.id), "unauthorized");
  await expectCode("unknown game", client.getGame("definitely-not-a-game"), "not_found");

  const link = startAppLink("PlaynixGamesBot", "game_card-blitz");
  check("deep links", link === "https://t.me/PlaynixGamesBot?startapp=game_card-blitz", link ?? "null");
  check("start_param routing", resolveStartParam("game_card-blitz") === "/game/card-blitz");

  if (failures > 0) {
    console.error(`\n${failures} SDK check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll SDK checks passed.");
}

main().catch((error) => {
  console.error("SDK check crashed:", error);
  process.exit(1);
});
