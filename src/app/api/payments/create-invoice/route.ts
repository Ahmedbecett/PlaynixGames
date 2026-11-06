import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireUser, route } from "@/lib/api";
import { one } from "@/lib/db";
import { env } from "@/lib/env";
import { createStarsInvoice, getPlan } from "@/lib/payments";
import { consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ planId: z.string().min(1).max(80) });

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  if (!env.botConfigured) {
    throw new HttpError(503, "Telegram payments are not configured on this server.", "not_configured");
  }
  if (!consume(`invoice:${user.id}`, 8, 10 * 60_000).ok) {
    throw new HttpError(429, "Too many payment attempts. Please try again later.", "rate_limited");
  }

  const enabled = await one<{ value: string }>("SELECT value FROM app_settings WHERE key = 'premium_enabled'");
  if (enabled && enabled.value !== "true") {
    throw new HttpError(503, "Premium memberships are temporarily disabled.", "disabled");
  }

  const { planId } = await parseBody(request, schema);
  const plan = await getPlan(planId);
  if (!plan) throw new HttpError(404, "Plan not found.", "not_found");

  try {
    const invoice = await createStarsInvoice(user.id, plan);
    return json({ invoiceLink: invoice.invoiceLink, planId: plan.id, amount: plan.price });
  } catch (error) {
    console.error("[payments] invoice creation failed", error);
    throw new HttpError(502, "Telegram could not create the invoice. Please try again.", "telegram_error");
  }
});
