"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adsPublicConfig } from "@/lib/ads-shared";
import { useT } from "../LocaleProvider";
import { useTelegram } from "../TelegramBridge";
import { useToast } from "../Toast";
import { Icon } from "../Icons";
import { AdUnavailableError, showRewardedAd } from "./monetag";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "watching" }
  | { kind: "granting" }
  | { kind: "done"; minutes: number; playUrl: string; remaining: number }
  | { kind: "error"; message: string };

/**
 * "Watch an ad → play this premium game for N minutes".
 *
 * Rendered only when the server says ads are configured and the visitor is
 * signed in; the reward itself is issued by `POST /api/ads/reward` and validated
 * again when the player page opens.
 */
export function AdUnlockCard({
  gameSlug,
  gameTitle,
  minutes,
  remainingToday,
}: {
  gameSlug: string;
  gameTitle: string;
  minutes: number;
  remainingToday: number;
}) {
  const t = useT();
  const router = useRouter();
  const { haptic } = useTelegram();
  const { show } = useToast();
  const [state, setState] = useState<State>({ kind: "idle" });

  const config = adsPublicConfig();

  async function redeem() {
    if (state.kind === "loading" || state.kind === "watching" || state.kind === "granting") return;
    setState({ kind: "loading" });
    haptic("light");

    try {
      setState({ kind: "watching" });
      await showRewardedAd(config);

      setState({ kind: "granting" });
      const response = await fetch("/api/ads/reward", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId: gameSlug }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { pass?: { expiresAt: string }; minutes?: number; playUrl?: string; remainingToday?: number; error?: { code?: string; message?: string } }
        | null;

      if (!response.ok) {
        const code = payload?.error?.code;
        setState({
          kind: "error",
          message:
            code === "ad_limit_reached"
              ? t("ads.limit")
              : code === "ad_cooldown"
                ? t("ads.cooldown")
                : (payload?.error?.message ?? t("ads.error")),
        });
        haptic("error");
        return;
      }

      const grantedMinutes = payload?.minutes ?? minutes;
      const playUrl = payload?.playUrl ?? `/play/${gameSlug}`;
      setState({
        kind: "done",
        minutes: grantedMinutes,
        playUrl,
        remaining: payload?.remainingToday ?? Math.max(0, remainingToday - 1),
      });
      haptic("success");
      show(t("ads.success", { minutes: String(grantedMinutes) }), "success");
      router.refresh();
    } catch (error) {
      haptic("error");
      setState({
        kind: "error",
        message:
          error instanceof AdUnavailableError && error.reason === "blocked"
            ? t("ads.errorBlocked")
            : t("ads.error"),
      });
    }
  }

  if (!config.enabled) return null;

  return (
    <section
      className="mt-6 rounded-2xl border border-[rgba(255,122,24,.35)] p-4"
      style={{ background: "linear-gradient(135deg,rgba(255,122,24,.12),rgba(23,30,48,.6))" }}
      aria-labelledby="ad-unlock-title"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ background: "rgba(255,122,24,.18)", color: "var(--color-orange)" }}
        >
          <Icon name="play" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ad-unlock-title" className="text-sm font-extrabold">
            {t("ads.unlockTitle")}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            {t("ads.unlockBody", { game: gameTitle, minutes: String(minutes) })}
          </p>

          {state.kind === "done" ? (
            <div className="mt-3">
              <p className="mb-2 text-[12.5px] font-bold" style={{ color: "var(--color-success)" }}>
                {t("ads.success", { minutes: String(state.minutes) })}
              </p>
              <button
                type="button"
                onClick={() => router.push(state.playUrl)}
                className="btn btn-primary w-full text-[13px]"
              >
                {t("ads.playNow")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={redeem}
              disabled={state.kind === "loading" || state.kind === "watching" || state.kind === "granting"}
              className="btn mt-3 w-full border border-[rgba(255,122,24,.45)] bg-[rgba(255,122,24,.14)] text-[13px] font-extrabold text-[var(--color-orange)] disabled:opacity-60"
            >
              {state.kind === "watching"
                ? t("ads.watching")
                : state.kind === "granting"
                  ? t("ads.granting")
                  : state.kind === "loading"
                    ? t("ads.loading")
                    : t("ads.watch")}
            </button>
          )}

          {state.kind === "error" ? (
            <p className="mt-2 text-[11.5px]" style={{ color: "var(--color-danger)" }}>
              {state.message}
            </p>
          ) : null}

          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
            {t("ads.upgradeHint")}
            {state.kind !== "done" && remainingToday >= 0
              ? ` · ${t("ads.remaining", { count: String(remainingToday) })}`
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
