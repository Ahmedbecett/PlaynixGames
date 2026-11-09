import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getWebhookInfo, setChatMenuButton, setWebhook } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY: re-registers the Telegram webhook after the shared secret was
 * rotated. The bot token and the new secret only exist inside the deployment,
 * so this has to run server-side. Guarded by BOOTSTRAP_TOKEN, and the route is
 * deleted again as soon as it has done its job.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.BOOTSTRAP_TOKEN;
  const provided = request.headers.get("x-bootstrap-token");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = `${env.appUrl}/api/telegram/webhook`;
  try {
    await setWebhook(url, env.webhookSecret);
    await setChatMenuButton(env.appUrl, "Open Playnix");
    const info = await getWebhookInfo();
    return NextResponse.json({ ok: true, url, info });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
