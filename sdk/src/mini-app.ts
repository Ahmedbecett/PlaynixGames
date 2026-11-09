/**
 * Telegram Mini App helpers. Every function is SSR-safe: outside Telegram (or
 * on the server) it degrades to a no-op instead of throwing, so the same code
 * can run during prerendering.
 */

export type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotification = "error" | "success" | "warning";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser; start_param?: string; auth_date?: number; hash?: string };
  colorScheme?: "light" | "dark";
  themeParams?: Record<string, string>;
  viewportHeight?: number;
  isExpanded?: boolean;
  platform?: string;
  version?: string;
  ready(): void;
  expand(): void;
  close(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink?(url: string): void;
  openInvoice?(url: string, callback?: (status: "paid" | "cancelled" | "failed" | "pending") => void): void;
  shareToStory?(mediaUrl: string, params?: Record<string, unknown>): void;
  showAlert?(message: string, callback?: () => void): void;
  showConfirm?(message: string, callback?: (confirmed: boolean) => void): void;
  HapticFeedback?: {
    impactOccurred(style: HapticStyle): void;
    notificationOccurred(type: HapticNotification): void;
    selectionChanged(): void;
  };
  MainButton?: {
    text: string;
    isVisible: boolean;
    show(): void;
    hide(): void;
    setText(text: string): void;
    onClick(handler: () => void): void;
    offClick(handler: () => void): void;
  };
  BackButton?: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(handler: () => void): void;
    offClick(handler: () => void): void;
  };
  onEvent(event: string, handler: () => void): void;
  offEvent(event: string, handler: () => void): void;
};

type GlobalWithTelegram = typeof globalThis & { Telegram?: { WebApp?: TelegramWebApp } };

/** The raw `Telegram.WebApp` object, or `null` outside Telegram / on the server. */
export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (window as GlobalWithTelegram).Telegram?.WebApp ?? null;
}

export function isTelegram(): boolean {
  return getWebApp() !== null;
}

/** Call once on mount: tells Telegram the app is painted and expands the view. */
export function initMiniApp(): boolean {
  const app = getWebApp();
  if (!app) return false;
  try {
    app.ready();
    app.expand();
  } catch {
    /* older clients */
  }
  return true;
}

export function initData(): string {
  return getWebApp()?.initData ?? "";
}

export function currentUser(): TelegramWebAppUser | null {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}

export function startParam(): string | null {
  return getWebApp()?.initDataUnsafe?.start_param ?? null;
}

export function colorScheme(): "light" | "dark" {
  return getWebApp()?.colorScheme ?? "dark";
}

export function haptic(style: HapticStyle = "light"): void {
  getWebApp()?.HapticFeedback?.impactOccurred(style);
}

export function notify(type: HapticNotification): void {
  getWebApp()?.HapticFeedback?.notificationOccurred(type);
}

export function selectionChanged(): void {
  getWebApp()?.HapticFeedback?.selectionChanged();
}

/** Opens an external link the Telegram way (falls back to `window.open`). */
export function openLink(url: string): void {
  const app = getWebApp();
  if (app?.openLink) {
    app.openLink(url);
    return;
  }
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Opens a Stars invoice. Resolves `true` when Telegram reports the payment as
 * completed; the authoritative check is still the bot webhook.
 */
export function openInvoice(link: string): Promise<boolean> {
  const app = getWebApp();
  if (!app?.openInvoice) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      app.openInvoice!(link, (status) => resolve(status === "paid"));
    } catch {
      resolve(false);
    }
  });
}

export function showAlert(message: string): Promise<void> {
  const app = getWebApp();
  if (!app?.showAlert) return Promise.resolve();
  return new Promise((resolve) => app.showAlert!(message, () => resolve()));
}

export function showConfirm(message: string): Promise<boolean> {
  const app = getWebApp();
  if (!app?.showConfirm) return Promise.resolve(false);
  return new Promise((resolve) => app.showConfirm!(message, (confirmed) => resolve(confirmed)));
}

/** Wires the native back button; returns an unsubscribe function. */
export function onBackButton(handler: () => void): () => void {
  const app = getWebApp();
  const button = app?.BackButton;
  if (!button) return () => undefined;
  button.onClick(handler);
  button.show();
  return () => {
    button.offClick(handler);
    button.hide();
  };
}

/** Fires `handler` whenever the viewport height changes (keyboard, rotation). */
export function onViewportChange(handler: (height: number) => void): () => void {
  const app = getWebApp();
  if (!app?.onEvent) return () => undefined;
  const listener = () => handler(app.viewportHeight ?? 0);
  app.onEvent("viewportChanged", listener);
  return () => app.offEvent("viewportChanged", listener);
}
