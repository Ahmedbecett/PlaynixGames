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
  /** Automatic (no-click) ads: the page opens and an ad appears over it. */
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

/**
 * Every public env var this module needs, written out literally.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when the property is spelled
 * out at the call site. A dynamic lookup (`process.env[name]`) is left as-is and
 * compiles to the *empty* browser `process` shim, so the client saw
 * `NEXT_PUBLIC_ADS_ZONE_ID === undefined` and hid every ad surface while the
 * server (which has the real env) rendered them. Keep these literals verbatim:
 * `scripts/check-ads.ts` fails if a dynamic lookup comes back.
 */
const PUBLIC_ENV = {
  NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED,
  NEXT_PUBLIC_ADS_ZONE_ID: process.env.NEXT_PUBLIC_ADS_ZONE_ID,
  NEXT_PUBLIC_ADS_SDK_URL: process.env.NEXT_PUBLIC_ADS_SDK_URL,
  NEXT_PUBLIC_ADS_POPUP_FALLBACK: process.env.NEXT_PUBLIC_ADS_POPUP_FALLBACK,
  NEXT_PUBLIC_ADS_INAPP_ENABLED: process.env.NEXT_PUBLIC_ADS_INAPP_ENABLED,
  NEXT_PUBLIC_ADS_INAPP_FREQUENCY: process.env.NEXT_PUBLIC_ADS_INAPP_FREQUENCY,
  NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS: process.env.NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS,
  NEXT_PUBLIC_ADS_INAPP_INTERVAL: process.env.NEXT_PUBLIC_ADS_INAPP_INTERVAL,
  NEXT_PUBLIC_ADS_INAPP_TIMEOUT: process.env.NEXT_PUBLIC_ADS_INAPP_TIMEOUT,
  NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE: process.env.NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE,
} as const;

type PublicEnvName = keyof typeof PUBLIC_ENV;
type PublicEnvOverrides = Partial<Record<PublicEnvName, string | undefined>>;

function read(source: Record<PublicEnvName, string | undefined>, name: PublicEnvName): string | undefined {
  const value = source[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function numberFrom(source: Record<PublicEnvName, string | undefined>, name: PublicEnvName, fallback: number): number {
  const raw = read(source, name);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function flag(source: Record<PublicEnvName, string | undefined>, name: PublicEnvName, fallback = false): boolean {
  const value = read(source, name);
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

/**
 * Ads are only active with a real zone id — an empty id would silently break the
 * `show_<zone>()` call, so the UI hides every ad surface instead.
 */
export function adsConfigFrom(overrides: PublicEnvOverrides = {}): AdsPublicConfig {
  const source = { ...PUBLIC_ENV, ...overrides };
  const zoneId = read(source, "NEXT_PUBLIC_ADS_ZONE_ID") ?? null;
  const flagValue = read(source, "NEXT_PUBLIC_ADS_ENABLED");
  const providerEnabled = flagValue === "true" || flagValue === "1";
  return {
    enabled: providerEnabled && Boolean(zoneId && /^\d{4,12}$/.test(zoneId)),
    provider: "monetag",
    zoneId,
    sdkUrl: read(source, "NEXT_PUBLIC_ADS_SDK_URL") ?? DEFAULT_SDK_URL,
    popupFallback: flag(source, "NEXT_PUBLIC_ADS_POPUP_FALLBACK", true),
    inApp: {
      enabled: flag(source, "NEXT_PUBLIC_ADS_INAPP_ENABLED", false),
      frequency: numberFrom(source, "NEXT_PUBLIC_ADS_INAPP_FREQUENCY", 1),
      cappingHours: numberFrom(source, "NEXT_PUBLIC_ADS_INAPP_CAPPING_HOURS", 0.1),
      intervalSeconds: numberFrom(source, "NEXT_PUBLIC_ADS_INAPP_INTERVAL", 30),
      timeoutSeconds: numberFrom(source, "NEXT_PUBLIC_ADS_INAPP_TIMEOUT", 5),
      everyPage: flag(source, "NEXT_PUBLIC_ADS_INAPP_EVERY_PAGE", true),
    },
  };
}

/**
 * Config for the current build. Values are inlined into the client bundle at
 * build time, so this is a compile-time snapshot — `adsConfigFrom()` exists for
 * tests that need to exercise other combinations.
 */
export function adsPublicConfig(): AdsPublicConfig {
  return adsConfigFrom();
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
