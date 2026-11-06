"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useT } from "./LocaleProvider";
import { useTelegram } from "./TelegramBridge";
import { useToast } from "./Toast";
import { Icon } from "./Icons";

type Plan = { id: string; name: string; description: string | null; price: number; durationDays: number; features: string[] };

export function PremiumPlans({
  plans,
  premium,
  expiresAt,
  botConfigured,
  signedIn,
  reason,
}: {
  plans: Plan[];
  premium: boolean;
  expiresAt: string | null;
  botConfigured: boolean;
  signedIn: boolean;
  reason?: string;
}) {
  const t = useT();
  const { formatNumber, formatDate } = useLocale();
  const { haptic } = useTelegram();
  const { show } = useToast();
  const router = useRouter();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function pollForActivation(attempts = 10) {
    for (let index = 0; index < attempts; index += 1) {
      const response = await fetch("/api/payments/verify", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { premium: boolean };
        if (payload.premium) {
          setMessage({ kind: "success", text: t("premium.success") });
          haptic("success");
          router.refresh();
          return true;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return false;
  }

  async function subscribe(plan: Plan) {
    if (!signedIn) {
      show(t("premium.loginRequired"), "info");
      return;
    }
    if (!botConfigured) {
      show(t("premium.notConfigured"), "error");
      return;
    }
    setBusyPlan(plan.id);
    setMessage(null);
    haptic("light");
    try {
      const response = await fetch("/api/payments/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "failed");
      }
      const { invoiceLink } = (await response.json()) as { invoiceLink: string };

      const webApp = window.Telegram?.WebApp as
        | (NonNullable<Window["Telegram"]>["WebApp"] & {
            openInvoice?: (url: string, callback?: (status: string) => void) => void;
          })
        | undefined;

      if (webApp?.openInvoice) {
        webApp.openInvoice(invoiceLink, (status) => {
          if (status === "paid") {
            setMessage({ kind: "success", text: t("premium.processing") });
            void pollForActivation();
          } else if (status === "failed" || status === "cancelled") {
            setMessage({ kind: "error", text: t("premium.failed") });
            haptic("error");
          }
          setBusyPlan(null);
        });
        return;
      }

      window.open(invoiceLink, "_blank", "noopener,noreferrer");
      setMessage({ kind: "success", text: t("premium.processing") });
      void pollForActivation();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error && error.message !== "failed" ? error.message : t("common.error") });
      haptic("error");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <div>
      {(premium || reason === "locked" || message) && (
        <div
          className="mb-4 rounded-xl p-3.5 text-sm"
          style={{
            background: message?.kind === "error" || reason === "locked" ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)",
            border: `1px solid ${message?.kind === "error" || reason === "locked" ? "rgba(239,68,68,.4)" : "rgba(34,197,94,.4)"}`,
          }}
        >
          {message?.text ??
            (premium
              ? `${t("premium.currentPlan")}: ${expiresAt ? t("premium.activeUntil", { date: formatDate(expiresAt) }) : ""}`
              : reason === "locked"
                ? t("game.premiumOnlyBody")
                : "")}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="relative flex flex-col rounded-2xl border p-4"
            style={{
              background: "linear-gradient(160deg,rgba(29,39,64,.9),rgba(17,22,38,.9))",
              borderColor: plan.durationDays >= 90 ? "rgba(255,122,24,.5)" : "rgba(139,92,246,.25)",
            }}
          >
            {plan.durationDays >= 90 && (
              <span
                className="absolute -top-2 end-3 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase"
                style={{ background: "var(--color-orange)", color: "#0b0f18" }}
              >
                {t("common.featured")}
              </span>
            )}
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
              {t("premium.perDays", { days: plan.durationDays })}
            </p>
            <p className="mt-1 text-lg font-extrabold">{plan.name}</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-[850]">{formatNumber(plan.price)}</span>
              <span className="text-xs font-bold text-[var(--color-muted)]">Stars</span>
            </p>
            {plan.description && <p className="mt-1 text-[11px] leading-snug text-[var(--color-muted)]">{plan.description}</p>}
            <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--color-muted)]">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-1.5">
                  <Icon name="check" size={13} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: 2 }} />
                  <span>{t(feature as never)}</span>
                </li>
              ))}
            </ul>
            <button
              className="btn mt-4 w-full"
              onClick={() => subscribe(plan)}
              disabled={busyPlan !== null}
              style={plan.durationDays >= 90 ? undefined : { background: "linear-gradient(135deg,#8B5CF6,#22D3EE)" }}
            >
              <Icon name="crown" size={15} />
              {busyPlan === plan.id ? t("common.loading") : premium ? t("premium.renew") : t("premium.subscribe")}
            </button>
          </div>
        ))}
      </div>

      {!botConfigured && (
        <p className="mt-3 rounded-xl border border-[rgba(255,122,24,.35)] p-3 text-[11px] text-[var(--color-muted)]">
          {t("premium.notConfigured")}
        </p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
        <Icon name="shield" size={12} /> {t("premium.verifyNote")}
      </p>
    </div>
  );
}
