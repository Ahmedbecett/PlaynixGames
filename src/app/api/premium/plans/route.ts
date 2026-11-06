import { json, route } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { listPlans, planFeatures } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const locale = await getLocale();
  const plans = await listPlans();
  return json({
    currency: "XTR",
    plans: plans.map((plan) => ({
      id: plan.id,
      name: (locale === "ar" && plan.name_ar) || (locale === "fr" && plan.name_fr) || plan.name,
      description: plan.description,
      price: Number(plan.price),
      durationDays: Number(plan.duration_days),
      features: planFeatures(plan),
    })),
  });
});
