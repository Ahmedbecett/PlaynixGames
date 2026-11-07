import type { NextConfig } from "next";
import { ADS_CSP, adsPublicConfig } from "./src/lib/ads-shared";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // node:sqlite + pg must stay outside the bundler
  serverExternalPackages: ["pg"],
  async headers() {
    // In development the app is reviewed inside the sandbox preview iframe, so
    // framing must stay open. Production locks framing to Telegram clients only.
    const isDev = process.env.NODE_ENV === "development";
    // Ad hosts are only opened up when a rewarded-ad zone is configured, so the
    // production CSP stays tight for deployments that do not monetise with ads.
    const ads = adsPublicConfig();
    const adScript = ads.enabled ? ` ${ADS_CSP.script.join(" ")}` : "";
    const adConnect = ads.enabled ? ` ${ADS_CSP.connect.join(" ")}` : "";
    const adFrame = ads.enabled ? ` ${ADS_CSP.frame.join(" ")}` : "";
    const adMedia = ads.enabled ? ` ${ADS_CSP.media.join(" ")}` : "";
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(self)",
      },
      // Game frames are same-origin (self-hosted) or verified https hosts.
      ...(isDev ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
    ];
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Telegram must be able to embed the Mini App.
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              `media-src 'self' blob: https:${adMedia}`,
              process.env.NODE_ENV === "development"
                ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org${adScript}`
                : `script-src 'self' 'unsafe-inline' https://telegram.org${adScript}`,
              "style-src 'self' 'unsafe-inline'",
              `frame-src 'self' https:${adFrame}`,
              `connect-src 'self' https:${adConnect}`,
              "font-src 'self' data: https:",
              isDev
                ? "frame-ancestors *"
                : "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
