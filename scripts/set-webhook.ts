/**
 * Registers (or removes) the Telegram webhook for the deployed Mini App.
 * Usage:
 *   npm run bot:webhook            # register https://<NEXT_PUBLIC_APP_URL>/api/telegram/webhook
 *   npm run bot:webhook -- --delete
 */
import { env } from "../src/lib/env";
import { deleteWebhook, getMe, getWebhookInfo, setChatMenuButton, setWebhook } from "../src/lib/telegram";

async function main() {
  if (!env.botConfigured) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Add it to .env.local or your host's env vars.");
    process.exit(1);
  }
  const bot = await getMe();
  console.log(`Bot: @${bot.username} (${bot.id})`);

  if (process.argv.includes("--delete")) {
    await deleteWebhook();
    console.log("Webhook removed.");
    return;
  }

  if (!env.webhookSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is missing — refusing to register an unauthenticated webhook.");
    process.exit(1);
  }
  const url = `${env.appUrl}/api/telegram/webhook`;
  if (!url.startsWith("https://")) {
    console.error(`NEXT_PUBLIC_APP_URL must be a public https URL (got ${env.appUrl}). Use a tunnel for local testing.`);
    process.exit(1);
  }

  await setWebhook(url, env.webhookSecret);
  await setChatMenuButton(env.appUrl, "Open Playnix");
  console.log(`Webhook registered: ${url}`);
  console.log(await getWebhookInfo());
}

main().catch((error) => {
  console.error("Webhook registration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
