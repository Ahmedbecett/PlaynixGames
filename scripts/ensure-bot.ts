/**
 * Deploy-time bot wiring, wired into `prebuild`.
 *
 * Every deployment points the Telegram webhook and the chat menu button at the
 * URL in NEXT_PUBLIC_APP_URL, so a new domain never leaves a dead bot behind.
 * It never fails the build: Telegram may be unreachable from a CI runner, and
 * the admin panel can register the webhook manually (Admin → System).
 */
import { env } from "../src/lib/env";
import { getMe, setChatMenuButton, setWebhook } from "../src/lib/telegram";

async function main() {
  if (!env.botToken) {
    console.log("[playnix] TELEGRAM_BOT_TOKEN is empty — skipping bot wiring.");
    return;
  }
  if (!env.webhookSecret) {
    console.log("[playnix] TELEGRAM_WEBHOOK_SECRET is empty — refusing to register an unauthenticated webhook.");
    return;
  }
  const appUrl = env.appUrl;
  if (!appUrl.startsWith("https://")) {
    console.log(`[playnix] NEXT_PUBLIC_APP_URL is not https (${appUrl}) — skipping bot wiring.`);
    return;
  }

  try {
    const bot = await getMe();
    console.log(`[playnix] Bot reachable: @${bot.username} (${bot.id})`);
    await setWebhook(`${appUrl}/api/telegram/webhook`, env.webhookSecret);
    console.log(`[playnix] Webhook → ${appUrl}/api/telegram/webhook`);
    await setChatMenuButton(appUrl, "Open Playnix");
    console.log(`[playnix] Menu button → ${appUrl}`);
  } catch (error) {
    console.log(
      `[playnix] Bot wiring skipped (${error instanceof Error ? error.message : "unknown error"}). Register it from Admin → System.`,
    );
  }
}

main().catch((error) => {
  console.log("[playnix] Bot wiring skipped:", error instanceof Error ? error.message : error);
});
