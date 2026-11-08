import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { getCurrentUser, getPremiumStatus } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ToastProvider } from "@/components/Toast";
import { TelegramBridge } from "@/components/TelegramBridge";
import { AdRuntime } from "@/components/ads/AdRuntime";
import { adsPublicConfig } from "@/lib/ads-shared";

export const metadata: Metadata = {
  title: {
    default: "Playnix — Play instantly inside Telegram",
    template: "%s · Playnix",
  },
  description:
    "Search thousands of licensed games and play compatible titles instantly inside Telegram. No installs, no APKs.",
  applicationName: "Playnix",
  authors: [{ name: "Playnix" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/logo-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/icon-512.png" }],
  },
  robots: { index: false, follow: false },
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
