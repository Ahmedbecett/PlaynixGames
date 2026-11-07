import { json, route } from "@/lib/api";
import { getCurrentUser, getPremiumStatus, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return json({ user: null, premium: false });
  const premium = await getPremiumStatus();
  return json({
    user: publicUser(user),
    premium: premium.premium,
    subscription: premium.subscription
      ? { expiresAt: premium.subscription.expires_at, planId: premium.subscription.plan_id }
      : null,
  });
});
