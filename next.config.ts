import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // node:sqlite + pg must stay outside the bundler
  serverExternalPackages: ["pg"],
  async redirects() {
    // Legacy/alternate entry points → canonical pages (keeps link equity).
    return [
      { source: "/games", destination: "/categories", permanent: true },
      { source: "/games/:slug", destination: "/game/:slug", permanent: true },
      { source: "/game", destination: "/categories", permanent: true },
      { source: "/category", destination: "/categories", permanent: true },
    ];
  },
  async headers() {
    // In development the app is reviewed inside the sandbox preview iframe, so
    // framing must stay open. Production locks framing to Telegram clients only.
    const isDev = process.env.NODE_ENV === "development";
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
              "media-src 'self' blob: https:",
              process.env.NODE_ENV === "development"
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org"
                : "script-src 'self' 'unsafe-inline' https://telegram.org",
              "style-src 'self' 'unsafe-inline'",
              "frame-src 'self' https:",
              "connect-src 'self' https:",
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
