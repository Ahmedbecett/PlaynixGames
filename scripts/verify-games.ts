/**
 * Verifies every published game's launch URL with the same checks the admin
 * dashboard uses. Exits non-zero if fewer than five games pass.
 */
import { all, ensureSchema } from "../src/lib/db";
import { verifyGameUrl } from "../src/lib/verify-game";

type Game = { id: string; title: string; slug: string; game_url: string | null; publication_status: string; game_type: string };

async function main() {
  await ensureSchema();
  const games = await all<Game>(
    "SELECT id, title, slug, game_url, publication_status, game_type FROM games WHERE publication_status = 'published' ORDER BY title",
  );
  if (games.length === 0) {
    console.error("No published games found. Run `npm run db:seed` first.");
    process.exit(1);
  }

  let passing = 0;
  for (const game of games) {
    if (game.game_type !== "html5" || !game.game_url) {
      console.log(`SKIP  ${game.title} (${game.game_type}) — not an instant-play HTML5 title`);
      continue;
    }
    const result = await verifyGameUrl(game.game_url);
    if (result.ok) passing += 1;
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${game.title} → ${game.game_url}`);
    for (const check of result.checks.filter((item) => !item.ok)) {
      console.log(`        ✗ ${check.name}: ${check.detail}`);
    }
  }

  console.log(`\n${passing}/${games.length} published HTML5 games verified.`);
  if (passing < 5) {
    console.error("Acceptance requires at least five working, licensed HTML5 games.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
