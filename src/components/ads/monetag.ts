"use client";

/**
 * Thin, fail-safe wrapper around the Monetag web SDK.
 *
 * The SDK (https://libtl.com/sdk.js) installs a global `show_<zoneId>(format?)`
 * per zone. Everything here degrades to a rejected promise instead of throwing
 * into React: if the script is blocked (ad blocker, webview policy, CSP), the
 * app keeps working and the UI simply reports "ad unavailable".
 */
import { monetagFunctionName, type AdsPublicConfig } from "@/lib/ads-shared";

type MonetagZoneFunction = (format?: "pop" | { type: "inApp"; inAppSettings: Record<string, unknown> }) => Promise<unknown>;

export class AdUnavailableError extends Error {
  constructor(readonly reason: "sdk" | "timeout" | "blocked" | "unsupported" | "busy") {
    super(`ad_unavailable:${reason}`);
    this.name = "AdUnavailableError";
  }
}

let sdkLoader: Promise<void> | null = null;
let inFlight = false;

function zoneFunction(zoneId: string): MonetagZoneFunction {
  const fn = (window as unknown as Record<string, unknown>)[monetagFunctionName(zoneId)];
  if (typeof fn !== "function") throw new AdUnavailableError("sdk");
  return fn as MonetagZoneFunction;
}

/** Injects the SDK script once and waits until the zone function exists. */
export function loadAdSdk(config: AdsPublicConfig, timeoutMs = 8000): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new AdUnavailableError("unsupported"));
  if (!config.enabled || !config.zoneId) return Promise.reject(new AdUnavailableError("unsupported"));
  if (sdkLoader) return sdkLoader;

  const globalName = monetagFunctionName(config.zoneId);

  sdkLoader = new Promise<void>((resolve, reject) => {
    if (typeof (window as unknown as Record<string, unknown>)[globalName] === "function") {
      resolve();
      return;
    }

    const script = document.createElement("script");
    let settled = false;
    const timer = window.setTimeout(() => finish(new AdUnavailableError("timeout")), timeoutMs);

    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) {
        reject(error);
        return;
      }
      // The script can load before the provider attaches its global; poll briefly.
      const deadline = Date.now() + 3000;
      const poll = () => {
        if (typeof (window as unknown as Record<string, unknown>)[globalName] === "function") resolve();
        else if (Date.now() > deadline) reject(new AdUnavailableError("sdk"));
        else window.setTimeout(poll, 120);
      };
      poll();
    }

    script.src = config.sdkUrl;
    script.async = true;
    script.dataset.playnixAds = "1";
    script.addEventListener("load", () => finish(), { once: true });
    script.addEventListener("error", () => finish(new AdUnavailableError("blocked")), { once: true });
    document.head.appendChild(script);
  });

  // A failed load must be retryable on the next user gesture.
  sdkLoader.catch(() => {
    sdkLoader = null;
  });
  return sdkLoader;
}

function withTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new AdUnavailableError("timeout")), ms);
    promise.then(
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new AdUnavailableError("sdk"));
      },
    );
  });
}

/**
 * Rewarded interstitial (`show_<zone>()`), falling back to the rewarded popup
 * (`show_<zone>('pop')`) when the provider refuses the first format.
 * Resolves only when the provider reports the user watched to the end.
 */
export async function showRewardedAd(
  config: AdsPublicConfig,
  options: { timeoutMs?: number; allowPopupFallback?: boolean } = {},
): Promise<{ format: "interstitial" | "popup" }> {
  if (!config.zoneId) throw new AdUnavailableError("unsupported");
  if (inFlight) throw new AdUnavailableError("busy");
  await loadAdSdk(config);

  const zoneId = config.zoneId;
  const timeout = options.timeoutMs ?? 90_000;
  const attempt = async (format: "interstitial" | "popup") => {
    const fn = zoneFunction(zoneId);
    const pending = format === "popup" ? fn("pop") : fn();
    await withTimeout(Promise.resolve(pending), timeout);
    return { format };
  };

  inFlight = true;
  const task = (async () => {
    try {
      return await attempt("interstitial");
    } catch (error) {
      if (!(options.allowPopupFallback ?? config.popupFallback)) throw error;
      return await attempt("popup");
    }
  })();

  try {
    return await task;
  } finally {
    inFlight = false;
  }
}

/**
 * Automatic in-app interstitial (the provider decides when to show, subject to
 * frequency/capping settings). Returns false when the SDK is not available.
 */
export async function startInAppInterstitial(config: AdsPublicConfig): Promise<boolean> {
  if (!config.enabled || !config.zoneId || !config.inApp.enabled) return false;
  try {
    await loadAdSdk(config);
    const fn = zoneFunction(config.zoneId);
    await fn({
      type: "inApp",
      inAppSettings: {
        frequency: config.inApp.frequency,
        capping: config.inApp.cappingHours,
        interval: config.inApp.intervalSeconds,
        timeout: config.inApp.timeoutSeconds,
        everyPage: config.inApp.everyPage,
      },
    });
    return true;
  } catch {
    return false;
  }
}
