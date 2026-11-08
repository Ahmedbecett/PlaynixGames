"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { adsPublicConfig } from "@/lib/ads-shared";
import { startAutoAd } from "./monetag";

const LAST_SHOWN_KEY = "playnix:ads:last";
const PLAYER_KEY = "playnix:ads:player";

/**
 * Live ads: the page opens and an ad appears on its own — no button, no link.
 *
 * Rules that keep this from becoming hostile:
 *   - everywhere the public can reach, signed in or not — the entry screen is the
 *     most valuable impression and needs no account;
 *   - never in `/admin`;
 *   - inside the player (`/play/*`) at most once per session: an ad on the way in
 *     is fine, an ad over a running game is not;
 *   - never for subscribers (admins keep seeing them so the setup is verifiable);
 *   - at most one attempt per `NEXT_PUBLIC_ADS_INAPP_INTERVAL` seconds per session,
 *     on top of the frequency/capping the provider applies itself;
 *   - if the browser blocks the automatic attempt (ad blockers, webview policy),
 *     retry exactly once on the first real interaction.
 */
export function AdRuntime({ premium, admin = false }: { premium: boolean; admin?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    const config = adsPublicConfig();
    if (!config.enabled || !config.inApp.enabled) return;
    if (premium && !admin) return;
    if (pathname?.startsWith("/admin")) return;
    if (pathname === "/privacy" || pathname?.startsWith("/privacy/")) return;
    const inPlayer = Boolean(pathname?.startsWith("/play/"));
    if (inPlayer && window.sessionStorage.getItem(PLAYER_KEY) === "1") return;

    let cancelled = false;
    let retryAttached = false;

    const intervalMs = Math.max(5, config.inApp.intervalSeconds) * 1000;
    const last = Number(window.sessionStorage.getItem(LAST_SHOWN_KEY) ?? 0) || 0;
    const wait = Math.max(400, intervalMs - (Date.now() - last));

    async function attempt() {
      if (cancelled) return;
      window.sessionStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      if (inPlayer) window.sessionStorage.setItem(PLAYER_KEY, "1");
      const result = await startAutoAd(config);
      if (cancelled || result.shown || retryAttached) return;
      retryAttached = true;
      // Providers often refuse an ad with no gesture at all; one tap anywhere is
      // the standard way to satisfy that without a dedicated button.
      const retry = () => {
        void startAutoAd(config);
      };
      window.addEventListener("pointerdown", retry, { once: true, passive: true });
    }

    // Long waits must not stack up on navigation: cap the delay so a page the
    // user is actually looking at gets its ad soon after paint.
    const timer = window.setTimeout(() => void attempt(), Math.min(wait, 5000));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, premium, admin]);

  return null;
}
