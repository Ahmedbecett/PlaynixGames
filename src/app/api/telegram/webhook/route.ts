import { NextRequest } from "next/server";
import { verifyWebhookSecret, type TelegramUpdate } from "playnix-sdk/server";
import { HttpError, json, route } from "@/lib/api";
import { env } from "@/lib/env";
import { handleUpdate } from "@/lib/bot";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook endpoint.
 * Authenticated with the secret token registered via setWebhook
 * (X-Telegram-Bot-Api-Secret-Token, compared in constant time by the SDK), plus
 * idempotency on update_id stored in `telegram_updates`.
 */
export const POST = route(async (request: NextRequest) => {
  if (!env.webhookSecret) {
    throw new HttpError(503, "Webhook secret is not configured.", "not_configured");
  }
  if (!verifyWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"), env.webhookSecret)) {
    throw new HttpError(401, "Invalid webhook secret.", "unauthorized");
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== "number") {
    throw new HttpError(400, "Malformed update.", "bad_request");
  }

  // Always answer Telegram fast; processing errors must not retrigger loops.
  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("[telegram] update failed", error);
  }

  return json({ ok: true });
});
