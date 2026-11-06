/**
 * Long-polling bot runner for local development (no public URL required).
 * Production uses the webhook at /api/telegram/webhook instead.
 *   npm run bot:poll
 */
import { env } from "../src/lib/env";
import { callTelegramApi } from "../src/lib/telegram";
import { handleUpdate } from "../src/lib/bot";

type Update = { update_id: number };

async function main() {
  if (!env.botConfigured) {
    console.error("TELEGRAM_BOT_TOKEN is missing.");
    process.exit(1);
  }
  console.log("Playnix bot polling started. Press Ctrl+C to stop.");
  let offset = 0;

  for (;;) {
    try {
      const updates = await callTelegramApi<Update[]>("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query", "pre_checkout_query"],
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update as never);
          console.log(`handled update ${update.update_id}`);
        } catch (error) {
          console.error(`update ${update.update_id} failed`, error);
        }
      }
    } catch (error) {
      console.error("polling error:", error instanceof Error ? error.message : error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

main();
