/**
 * Ad-network configuration shared by the browser, the server and `next.config.ts`.
 *
 * Nothing here touches a secret: the Monetag zone id is public by design (it is
 * embedded in the page to call `show_<zone>()`). Policy that must not be
 * tampered with (reward length, daily cap) lives in `src/lib/ads.ts` on the
 * server only.
 */

export type AdsProvider = "monetag";

export type AdsPublicConfig = {
  enabled: boolean;
  provider: AdsProvider;
  zoneId: string | null;
  sdkUrl: string;
  /** Use the rewarded popup format as a fallback when the interstitial errors. */
  popupFallback: boolean;
  /** Automatic in-app interstitials (off unless explicitly enabled). */
  inApp: {
    enabled: boolean;
    frequency: number;
    cappingHours: number;
    intervalSeconds: number;
    timeoutSeconds: number;
    everyPage: boolean;
  };
};

const DEFAULT_SDK_URL = "https://libtl.com/sdk.js";

function read(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function numberFrom(name: string, fallback: number): number {
  const raw = read(name);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function flag(name: string, fallback = false): boolean {
  const value = read(name);
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

/**
 * Ads are only active with a real zone id — an empty id would silently break the
 * `show_<zone>()` call, so the UI hides every ad surface instead.
 */
export function adsPublicConfig(): AdsPublicConfig {
  const zoneId = read("NEXT_PUBLIC_ADS_ZONE_ID") ?? null;
  const providerEnabled = read("NEXT_PUBLIC_ADS_ENABLED") === "true" || read("NEXT_PUBLIC_ADS_ENABLED") === "1";
  return {
    enabled: providerEnabled && Boolean(zoneId && /^\d{4,12}$/.test(zoneId)),
    provider: "monetag",
    zoneId,
    sdkUrl: read("NEXT_PUBLIC_ADS_SDK_URL") ?? DEFAULT_SDK_URL,
    popupFallback: flag("NEXT_PUBLIC_ADS_POPUP_FALLBACK", true),
    inApp: {
      enabled: flag("NEXT_PUBLIC_ADS_INAPP_ENABLED", false),
      frequency: numberFrom("NEXT_PUBLIC_ADS_INAPP_FREQUENCY", 2),
      cappingHours: numberFrom("NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS", 0.1),
      intervalSeconds: numberFrom("NEXT_PUBLIC_ADS_INAPP_INTERVAL", 30),
      timeoutSeconds: numberFrom("NEXT_PUBLIC_ADS_INAPP_TIMEOUT", 5),
      everyPage: flag("NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE", false),
    },
  };
}

/** Global function the Monetag SDK installs for a zone (`show_12207042`). */
export function monetagFunctionName(zoneId: string): string {
  return `show_${zoneId}`;
}

/**
 * Hosts the ad SDK needs. Kept in one place so the CSP in `next.config.ts` and
 * the contract test can never drift apart.
 */
export const ADS_CSP = {
  script: ["https://libtl.com", "https://*.libtl.com"],
  connect: ["https://libtl.com", "https://*.libtl.com", "https://*.monetag.com", "https://*.propellerads.com"],
  frame: ["https://libtl.com", "https://*.libtl.com", "https://*.monetag.com", "https://*.propellerads.com"],
  // img-src / media-src already allow https:, listed for documentation value.
  media: ["https://libtl.com", "https://*.monetag.com"],
} as const;
