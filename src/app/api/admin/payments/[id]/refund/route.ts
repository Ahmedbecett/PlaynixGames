import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { one } from "@/lib/db";
import { revokeForRefund } from "@/lib/payments";
import { callTelegramApi } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * Refunds a Stars payment through Telegram and revokes the entitlement.
 * Telegram is the source of truth: if the refund call fails, nothing changes.
 */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;

  const payment = await one<{ id: string; user_id: string; status: string; raw_payload: string | null; amount: number }>(
    "SELECT id, user_id, status, raw_payload, amount FROM payments WHERE id = ?",
    [id],
  );
  if (!payment) throw new HttpError(404, "Payment not found.", "not_found");
  if (payment.status !== "paid") throw new HttpError(409, "Only paid payments can be refunded.", "invalid_state");

  let chargeId: string | null = null;
  try {
    chargeId = payment.raw_payload ? (JSON.parse(payment.raw_payload) as { chargeId?: string }).chargeId ?? null : null;
  } catch {
    chargeId = null;
  }
  if (!chargeId) throw new HttpError(422, "This payment has no Telegram charge id on record.", "missing_charge");

  try {
    await callTelegramApi("refundStarPayment", { user_id: Number(await telegramIdFor(payment.user_id)), telegram_payment_charge_id: chargeId });
  } catch (error) {
    throw new HttpError(502, `Telegram refund failed: ${error instanceof Error ? error.message : "unknown"}`, "telegram_error");
  }

  await revokeForRefund(chargeId);
  await logAdminAction({
    adminId: admin.id,
    action: "payment.refund",
    entityType: "payment",
    entityId: id,
    metadata: { chargeId, amount: payment.amount },
    ip: clientIp(request),
  });
  return json({ ok: true });
});

async function telegramIdFor(userId: string): Promise<string> {
  const row = await one<{ telegram_id: string }>("SELECT telegram_id FROM users WHERE id = ?", [userId]);
  if (!row) throw new HttpError(404, "User not found.", "not_found");
  return row.telegram_id;
}
