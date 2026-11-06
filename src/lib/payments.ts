import crypto from "node:crypto";
import { all, one, run, transaction } from "./db";
import { nowIso } from "./time";
import { createInvoiceLink } from "./telegram";

export type Plan = {
  id: string;
  name: string;
  name_ar: string | null;
  name_fr: string | null;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  features: string | null;
  status: string;
  sort_order: number;
};

export async function listPlans(onlyActive = true): Promise<Plan[]> {
  return all<Plan>(
    `SELECT * FROM plans ${onlyActive ? "WHERE status = 'active'" : ""} ORDER BY sort_order ASC, price ASC`,
  );
}

export async function getPlan(id: string): Promise<Plan | null> {
  return one<Plan>("SELECT * FROM plans WHERE id = ? AND status = 'active'", [id]);
}

export function planFeatures(plan: Plan): string[] {
  if (!plan.features) return [];
  try {
    const parsed = JSON.parse(plan.features);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Creates a Telegram Stars invoice and a pending payment row.
 * The invoice payload is the idempotency key used by the webhook.
 */
export async function createStarsInvoice(userId: string, plan: Plan): Promise<{ invoiceLink: string; payload: string }> {
  const nonce = crypto.randomBytes(6).toString("hex");
  const payload = `${plan.id}:${userId}:${nonce}`;
  if (Buffer.byteLength(payload) > 128) throw new Error("Invoice payload exceeds Telegram's 128 byte limit.");

  const invoiceLink = await createInvoiceLink({
    title: plan.name,
    description: plan.description ?? `${plan.duration_days} days of Playnix Premium`,
    payload,
    stars: plan.price,
  });

  const now = nowIso();
  await run(
    `INSERT INTO payments (id, user_id, plan_id, provider, transaction_id, payload, amount, currency, status, created_at, updated_at)
     VALUES (?, ?, ?, 'telegram_stars', ?, ?, ?, 'XTR', 'pending', ?, ?)`,
    [crypto.randomUUID(), userId, plan.id, payload, payload, plan.price, now, now],
  );

  return { invoiceLink, payload };
}

export type FulfilResult =
  | { ok: true; alreadyProcessed: boolean; expiresAt: string | null }
  | { ok: false; reason: string };

/**
 * Grants Premium **only** from a verified Telegram successful_payment update.
 * Never call this from a client-triggered endpoint.
 */
export async function fulfilStarsPayment(input: {
  payload: string;
  chargeId: string;
  amount: number;
  currency: string;
  raw?: unknown;
}): Promise<FulfilResult> {
  const payment = await one<{
    id: string;
    user_id: string;
    plan_id: string | null;
    amount: number;
    status: string;
  }>("SELECT id, user_id, plan_id, amount, status FROM payments WHERE transaction_id = ?", [input.payload]);

  if (!payment) return { ok: false, reason: "unknown_payload" };
  if (payment.status === "paid") {
    const subscription = await one<{ expires_at: string }>(
      "SELECT expires_at FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1",
      [payment.user_id],
    );
    return { ok: true, alreadyProcessed: true, expiresAt: subscription?.expires_at ?? null };
  }
  if (input.currency !== "XTR") return { ok: false, reason: "unexpected_currency" };
  if (input.amount < Number(payment.amount)) return { ok: false, reason: "amount_mismatch" };

  const plan = payment.plan_id ? await one<Plan>("SELECT * FROM plans WHERE id = ?", [payment.plan_id]) : null;
  if (!plan) return { ok: false, reason: "plan_missing" };

  const now = new Date();
  const nowText = now.toISOString();

  const expiresAt = await transaction(async (tx) => {
    const current = await tx.one<{ expires_at: string }>(
      "SELECT expires_at FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY expires_at DESC LIMIT 1",
      [payment.user_id],
    );
    const base = current && new Date(current.expires_at) > now ? new Date(current.expires_at) : now;
    const next = new Date(base.getTime() + plan.duration_days * 86_400_000).toISOString();

    if (current) {
      await tx.run("UPDATE subscriptions SET status = 'active', expires_at = ?, plan_id = ? WHERE user_id = ? AND status = 'active'", [
        next,
        plan.id,
        payment.user_id,
      ]);
    } else {
      await tx.run(
        `INSERT INTO subscriptions (id, user_id, plan_id, status, started_at, expires_at, created_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        [crypto.randomUUID(), payment.user_id, plan.id, nowText, next, nowText],
      );
    }

    await tx.run("UPDATE payments SET status = 'paid', transaction_id = ?, updated_at = ?, raw_payload = ? WHERE id = ?", [
      input.payload,
      nowText,
      JSON.stringify({ chargeId: input.chargeId, amount: input.amount, currency: input.currency, raw: input.raw ?? null }),
      payment.id,
    ]);

    return next;
  });

  return { ok: true, alreadyProcessed: false, expiresAt };
}

/** Marks a payment refunded and revokes the entitlement it granted. */
export async function revokeForRefund(chargeIdOrPayload: string): Promise<boolean> {
  const payment = await one<{ id: string; user_id: string; status: string }>(
    `SELECT id, user_id, status FROM payments
     WHERE transaction_id = ? OR raw_payload LIKE ?`,
    [chargeIdOrPayload, `%${chargeIdOrPayload}%`],
  );
  if (!payment) return false;
  const now = nowIso();
  await transaction(async (tx) => {
    await tx.run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?", [now, payment.id]);
    await tx.run("UPDATE subscriptions SET status = 'canceled', canceled_at = ? WHERE user_id = ? AND status = 'active'", [
      now,
      payment.user_id,
    ]);
  });
  return true;
}

export async function paymentStats() {
  const revenue = await one<{ total: unknown }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'",
  );
  const active = await one<{ total: unknown }>(
    "SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'active' AND expires_at > ?",
    [nowIso()],
  );
  return { revenueStars: Number(revenue?.total ?? 0), activeSubscriptions: Number(active?.total ?? 0) };
}
