import { json, requireUser, route } from "@/lib/api";
import { getActiveSubscription } from "@/lib/auth";
import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Read-only payment state check. Premium is granted exclusively by the
 * Telegram webhook (successful_payment) — this endpoint never grants access.
 */
export const GET = route(async () => {
  const user = await requireUser();
  const subscription = await getActiveSubscription(user.id);
  const pending = await one<{ total: unknown }>(
    "SELECT COUNT(*) AS total FROM payments WHERE user_id = ? AND status = 'pending'",
    [user.id],
  );
  const lastPaid = await one<{ created_at: string; amount: number }>(
    "SELECT created_at, amount FROM payments WHERE user_id = ? AND status = 'paid' ORDER BY created_at DESC LIMIT 1",
    [user.id],
  );

  return json({
    premium: Boolean(subscription),
    subscription: subscription ? { expiresAt: subscription.expires_at, planId: subscription.plan_id } : null,
    pendingPayments: Number(pending?.total ?? 0),
    lastPayment: lastPaid ? { at: lastPaid.created_at, amount: Number(lastPaid.amount) } : null,
  });
});
