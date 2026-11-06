import { NextRequest } from "next/server";
import { HttpError, json, route } from "@/lib/api";
import { env } from "@/lib/env";
import { handleUpdate } from "@/lib/bot";

export const dynamic = "force-dynamic";

/**
 * Telegram webhook endpoint.
 * Authenticated with the secret token registered via setWebhook
 * (X-Telegram-Bot-Api-Secret-Token), plus idempotency on update_id.
 */
export const POST = route(async (request: NextRequest) => {
  if (!env.webhookSecret) {
    throw new HttpError(503, "Webhook secret is not configured.", "not_configured");
  }
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!provided || provided !== env.webhookSecret) {
    throw new HttpError(401, "Invalid webhook secret.", "unauthorized");
  }

  const update = (await request.json().catch(() => null)) as { update_id?: number } | null;
  if (!update || typeof update.update_id !== "number") {
    throw new HttpError(400, "Malformed update.", "bad_request");
  }

  // Always answer Telegram fast; processing errors must not retrigger loops.
  try {
    await handleUpdate(update as never);
  } catch (error) {
    console.error("[telegram] update failed", error);
  }

  return json({ ok: true });
});
