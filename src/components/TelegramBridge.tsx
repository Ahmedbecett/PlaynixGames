"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft" | "success" | "error" | "warning";

type TelegramContextValue = {
  isTelegram: boolean;
  isPreview: boolean;
  initData: string;
  haptic: (style?: HapticStyle) => void;
  openExternal: (url: string) => void;
  shareUrl: (url: string, text: string) => Promise<"shared" | "copied" | "failed">;
};

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  isPreview: false,
  initData: "",
  haptic: () => {},
  openExternal: () => {},
  shareUrl: async () => "failed",
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: { id: number; first_name: string; username?: string } };
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: string) => void;
    notificationOccurred: (type: string) => void;
  };
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  version?: string;
  colorScheme?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function TelegramBridge({
  children,
  authenticated,
}: {
  children: ReactNode;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState({ isTelegram: false, initData: "", isPreview: false });
  const attempted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) return false;
      try {
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor?.("#090B14");
        webApp.setBackgroundColor?.("#090B14");
        webApp.disableVerticalSwipes?.();
      } catch {
        /* older clients */
      }
      const initData = webApp.initData || "";
      setState({ isTelegram: true, initData, isPreview: false });
      if (initData && !authenticated && !attempted.current) {
        attempted.current = true;
        fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const payload = await response.json().catch(() => null);
              console.warn("[playnix] telegram auth failed", payload);
              return;
            }
            if (!cancelled) router.refresh();
          })
          .catch((error) => console.warn("[playnix] telegram auth error", error));
      }
      return true;
    };

    if (!start()) {
      // The script may still be loading (slow networks).
      const timer = setInterval(() => {
        if (start() || cancelled) clearInterval(timer);
      }, 300);
      setTimeout(() => clearInterval(timer), 6000);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [authenticated, router]);

  const value = useMemo<TelegramContextValue>(
    () => ({
      isTelegram: state.isTelegram,
      initData: state.initData,
      isPreview: state.isPreview,
      haptic: (style: HapticStyle = "light") => {
        const webApp = window.Telegram?.WebApp;
        if (!webApp?.HapticFeedback) return;
        try {
          if (style === "success" || style === "error" || style === "warning") {
            webApp.HapticFeedback.notificationOccurred(style);
          } else {
            webApp.HapticFeedback.impactOccurred(style);
          }
        } catch {
          /* ignore */
        }
      },
      openExternal: (url: string) => {
        const webApp = window.Telegram?.WebApp;
        if (webApp?.openLink) webApp.openLink(url);
        else window.open(url, "_blank", "noopener,noreferrer");
      },
      shareUrl: async (url: string, text: string) => {
        const webApp = window.Telegram?.WebApp;
        const shareLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        if (webApp?.openTelegramLink) {
          webApp.openTelegramLink(shareLink);
          return "shared";
        }
        try {
          if (navigator.share) {
            await navigator.share({ title: "Playnix", text, url });
            return "shared";
          }
          await navigator.clipboard.writeText(url);
          return "copied";
        } catch {
          return "failed";
        }
      },
    }),
    [state],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}
