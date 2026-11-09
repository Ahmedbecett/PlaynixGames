import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  jsonLdGraph,
  organizationNode,
  websiteNode,
} from "@/lib/seo";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ToastProvider } from "@/components/Toast";
import { TelegramBridge } from "@/components/TelegramBridge";
import { AdRuntime } from "@/components/ads/AdRuntime";
import { adsPublicConfig } from "@/lib/ads-shared";

const verification = env.googleSiteVerification;

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: env.siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.webmanifest",
  category: "games",
  keywords: [
    "Playnix",
    "games inside Telegram",
    "Telegram Mini App games",
    "instant play games",
    "HTML5 games",
    "browser games",
    "ألعاب تيليجرام",
    "ألعاب فورية",
    "jeux Telegram",
  ],
  icons: {
    icon: [
      { url: "/brand/logo-mark.svg", type: "image/svg+xml" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-512.png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: env.siteUrl,
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Google Search Console "HTML tag" method (optional; the HTML file also works).
  ...(verification ? { verification: { google: verification } } : {}),
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090B14",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dict, dir } = await getDictionary();
  const user = await getCurrentUser();
  const premium = user ? (await getPremiumStatus()).premium : false;
  // Admins keep seeing live ads even with an active subscription, otherwise the
  // ad setup can never be verified from the owner's own Telegram account.
  const admin = user?.role === "admin";
  // Exposed on <body> so "are ads on for this visitor?" is answerable without
  // digging into the bundle. Purely informational — never gate on it server-side.
  const adsEnabled = adsPublicConfig().enabled;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body data-auth={user && user.status === "active" ? "in" : "out"} data-ads={adsEnabled ? "on" : "off"}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <script
          type="application/ld+json"
          // schema.org graph: brand + site entity (enables sitelinks search box).
          dangerouslySetInnerHTML={{ __html: jsonLdGraph([organizationNode(), websiteNode()]) }}
        />
        <LocaleProvider locale={locale} dict={dict}>
          <ToastProvider>
            <TelegramBridge authenticated={Boolean(user)}>
              <AdRuntime premium={premium} admin={admin} />
              {children}
            </TelegramBridge>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
