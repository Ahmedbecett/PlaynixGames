import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { env } from "@/lib/env";
import { getMe, getWebhookInfo, setChatMenuButton, setWebhook } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  if (!env.botConfigured) return json({ configured: false, webhook: null, bot: null });
  try {
    const [info, bot] = await Promise.all([getWebhookInfo(), getMe()]);
    return json({ configured: true, webhook: info, bot: { username: bot.username, firstName: bot.first_name } });
  } catch (error) {
    return json({ configured: true, error: error instanceof Error ? error.message : "telegram error", webhook: null, bot: null });
  }
});

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const body = (await request.json().catch(() => null)) as { action?: string } | null;

  if (!env.botConfigured) throw new HttpError(503, "TELEGRAM_BOT_TOKEN is not configured.", "not_configured");
  if (!env.webhookSecret) throw new HttpError(503, "TELEGRAM_WEBHOOK_SECRET is not configured.", "not_configured");

  if (body?.action === "set_webhook") {
    const url = `${env.appUrl}/api/telegram/webhook`;
    try {
      await setWebhook(url, env.webhookSecret);
      await setChatMenuButton(env.appUrl, "Open Playnix");
      await logAdminAction({ adminId: admin.id, action: "bot.webhook.set", entityType: "bot", metadata: { url }, ip: clientIp(request) });
      return json({ ok: true, url });
    } catch (error) {
      throw new HttpError(502, `Webhook registration failed: ${error instanceof Error ? error.message : "unknown"}`, "telegram_error");
    }
  }

  throw new HttpError(422, "Unknown bot action.", "bad_request");
});
