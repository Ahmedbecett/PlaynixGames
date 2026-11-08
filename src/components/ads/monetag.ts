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

  const zoneId = config.zoneId;
  const globalName = monetagFunctionName(zoneId);

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
    // Monetag's in-app SDK reads the zone from the tag itself; without these the
    // `show_<zone>` global can stay undefined even when the script loads.
    script.dataset.zone = zoneId;
    script.dataset.sdk = globalName;
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

/** Result of an automatic (no-click) ad attempt. */
export type AutoAdResult =
  | { shown: true; format: "inApp" | "interstitial" }
  | { shown: false; reason: "disabled" | "busy" | "sdk" | "blocked" | "unsupported" };

/**
 * Show an ad **without any user gesture** — the "live" behaviour: the page opens
 * and an ad appears over it, no link and no button.
 *
 * Order matters: the in-app interstitial is the format Monetag wants for this
 * (it owns frequency/capping), and a plain `show_<zone>()` is the fallback for
 * zones that only serve the fullscreen interstitial. The promise is raced with a
 * short timeout because we do not need the completion signal here — a rejected or
 * slow provider must never hold the UI.
 */
export async function startAutoAd(config: AdsPublicConfig): Promise<AutoAdResult> {
  if (!config.enabled || !config.zoneId) return { shown: false, reason: "disabled" };
  if (inFlight) return { shown: false, reason: "busy" };

  inFlight = true;
  try {
    await loadAdSdk(config);
    const fn = zoneFunction(config.zoneId);

    try {
      await withTimeout(
        Promise.resolve(
          fn({
            type: "inApp",
            inAppSettings: {
              frequency: config.inApp.frequency,
              capping: config.inApp.cappingHours,
              interval: config.inApp.intervalSeconds,
              timeout: config.inApp.timeoutSeconds,
              everyPage: config.inApp.everyPage,
            },
          }),
        ),
        20_000,
      );
      return { shown: true, format: "inApp" };
    } catch {
      /* fall through to the plain interstitial */
    }

    try {
      await withTimeout(Promise.resolve(fn()), 20_000);
      return { shown: true, format: "interstitial" };
    } catch {
      return { shown: false, reason: "unsupported" };
    }
  } catch (error) {
    const reason = error instanceof AdUnavailableError ? error.reason : "sdk";
    return { shown: false, reason: reason === "timeout" ? "blocked" : reason };
  } finally {
    inFlight = false;
  }
}
