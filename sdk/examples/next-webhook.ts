/**
 * Drop-in Next.js App Router webhook for the Playnix bot.
 * Copy to `app/api/telegram/webhook/route.ts` of any Next.js 15 project.
 */
import { createWebhookHandler, parseCommand, parseStarsPayment, TelegramBot } from "../../dist/esm/server/index.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bot = new TelegramBot({ token: process.env.TELEGRAM_BOT_TOKEN ?? "" });

export const POST = createWebhookHandler({
  secret: process.env.TELEGRAM_WEBHOOK_SECRET,
  dedupe: true,
  onUpdate: async (update) => {
    const payment = parseStarsPayment(update);
    if (payment) {
      // Idempotency key: payment.invoice_payload. Verify the amount server-side
      // against your own pending-payment record before granting anything.
      await bot.sendMessage(update.message!.chat.id, `⭐ Payment received: ${payment.total_amount} ${payment.currency}`);
      return;
    }

    const text = update.message?.text;
    const chatId = update.message?.chat.id;
    if (!text || !chatId) return;

    const parsed = parseCommand(text);
    if (parsed?.command === "/start") {
      await bot.sendPhoto(chatId, `${process.env.NEXT_PUBLIC_APP_URL}/brand/welcome.jpg`, "<b>Welcome to Playnix 👋</b>", {
        replyMarkup: { inline_keyboard: [[{ text: "⭐ Subscribe", callback_data: "premium:plans" }]] },
      });
    }
  },
});
