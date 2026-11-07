"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { adsPublicConfig } from "@/lib/ads-shared";
import { startInAppInterstitial } from "./monetag";

/**
 * Automatic in-app interstitials (opt-in via NEXT_PUBLIC_ADS_INAPP_ENABLED).
 *
 * Never runs inside the player (`/play/*`): an ad over a running game would break
 * focus and feel like a bug, and rewarded ads already cover the player surface.
 * Premium members see no ads at all.
 */
export function AdRuntime({ premium }: { premium: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    const config = adsPublicConfig();
    if (!config.enabled || !config.inApp.enabled || premium) return;
    if (pathname?.startsWith("/play/") || pathname?.startsWith("/admin")) return;
    if (sessionStorage.getItem("playnix:ads:started") === "1") return;

    sessionStorage.setItem("playnix:ads:started", "1");
    let cancelled = false;
    // Give the first paint a moment: never compete with hydration or the
    // Telegram `ready()` handshake for the main thread.
    const timer = window.setTimeout(() => {
      if (!cancelled) void startInAppInterstitial(config);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, premium]);

  return null;
}
