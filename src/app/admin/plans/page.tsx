import { all } from "@/lib/db";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { PlanForm } from "@/components/admin/SimpleForms";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

type Plan = {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  currency: string;
  duration_days: number;
  status: string;
  features: string | null;
};

export default async function AdminPlansPage() {
  const { dict, locale } = await getDictionary();
  const plans = await all<Plan>("SELECT * FROM plans ORDER BY sort_order ASC, price ASC");

  return (
    <div className="fade-up space-y-4">
      <h1 className="text-lg font-extrabold">{dict["admin.plans.title"]}</h1>

      <div className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <PlanForm />
      </div>

      <ul className="space-y-2">
        {plans.map((plan) => (
          <li key={plan.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(139,92,246,.16)] p-3" style={{ background: "rgba(23,30,48,.5)" }}>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">{plan.name}</p>
              <p className="text-[10.5px] text-[var(--color-muted)]">
                {formatNumber(Number(plan.price), locale)} {plan.currency} · {plan.duration_days} days · {plan.features ?? "no features"}
              </p>
            </div>
            <span className="chip" style={{ color: plan.status === "active" ? "var(--color-success)" : "var(--color-muted)" }}>
              {plan.status}
            </span>
            <AdminActionButton
              endpoint="/api/admin/plans"
              method="PUT"
              label={plan.status === "active" ? dict["common.close"] : dict["admin.ads.enabled"]}
              body={{ id: plan.id, status: plan.status === "active" ? "inactive" : "active" }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
