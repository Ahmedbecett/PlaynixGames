import Link from "next/link";
import { getCurrentUser, getPremiumStatus, isAdmin } from "@/lib/auth";
import { one, count } from "@/lib/db";
import { env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n";
import { nowIso } from "@/lib/time";
import { Avatar } from "./Avatar";
import { BottomNav } from "./BottomNav";
import { HeaderSearch } from "./HeaderSearch";
import { Icon } from "./Icons";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PreviewAuth } from "./PreviewAuth";

async function unreadNotifications(userId: string | null): Promise<number> {
  if (!userId) {
    const row = await one<{ total: unknown }>("SELECT COUNT(*) AS total FROM notifications WHERE audience = 'all'");
    return count(row?.total);
  }
  const row = await one<{ total: unknown }>(
    `SELECT COUNT(*) AS total FROM notifications n
     WHERE (n.audience = 'all' OR n.user_id = ?)
       AND NOT EXISTS (SELECT 1 FROM user_notification_reads r WHERE r.notification_id = n.id AND r.user_id = ?)`,
    [userId, userId],
  );
  return count(row?.total);
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [{ dict }, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  const t = (key: keyof typeof dict) => dict[key];
  const [unread, premiumStatus] = await Promise.all([
    unreadNotifications(user?.id ?? null),
    getPremiumStatus(),
  ]);
  const showPreview = !user && env.allowDevLogin;

  const desktopLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/search", label: t("nav.search") },
    { href: "/categories", label: t("nav.categories") },
    { href: "/premium", label: t("common.premium") },
    { href: "/favorites", label: t("nav.favorites") },
  ];

  return (
    <div className="app-shell">
      <header className="safe-top sticky top-0 z-40" style={{ background: "rgba(9,11,20,.88)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(139,92,246,.14)" }}>
        <div className="page flex items-center gap-2 py-1.5">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={t("brand.name")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.svg" alt="" width={32} height={32} className="rounded-lg" />
            <span className="truncate text-[15px] font-extrabold tracking-tight">{t("brand.name")}</span>
          </Link>

          <nav className="ms-2 hidden items-center gap-1 md:flex" aria-label={t("nav.home")}>
            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-white/5 hover:text-[var(--color-cream)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5">
            {premiumStatus.premium && (
              <span className="chip" style={{ color: "#cbb6ff", borderColor: "rgba(139,92,246,.5)", padding: "0.28rem 0.55rem" }}>
                <Icon name="crown" size={12} />
                {t("common.premium")}
              </span>
            )}
            <LanguageSwitcher compact />
            <Link href="/notifications" className="icon-btn relative" aria-label={t("notifications.title")}>
              <Icon name="bell" size={18} />
              {unread > 0 && (
                <span
                  className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-extrabold text-[#0b0f18]"
                  style={{ background: "var(--color-orange)" }}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href={user ? "/profile" : "/profile"} aria-label={t("nav.profile")}>
              <Avatar photoUrl={user?.photo_url ?? null} name={user?.first_name ?? "P"} size={34} />
            </Link>
          </div>
        </div>
        <div className="page pb-1.5">
          <HeaderSearch />
        </div>
      </header>

      <main className="page flex-1 pt-3">
        {showPreview && <PreviewAuth />}
        {user?.status === "suspended" && (
          <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.4)" }}>
            {user.suspended_reason ?? t("errors.unauthorized")}
          </div>
        )}
        {children}
      </main>

      <footer className="page pt-4 pb-6 text-center text-[11px] text-[var(--color-muted)]">
        <div className="divider mb-3" />
        <nav className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-semibold">
          <Link href="/about" className="hover:text-[var(--color-cream)]">
            {t("footer.about")}
          </Link>
          <Link href="/privacy" className="hover:text-[var(--color-cream)]">
            {t("footer.privacy")}
          </Link>
          <Link href="/terms" className="hover:text-[var(--color-cream)]">
            {t("footer.terms")}
          </Link>
          <a href="https://t.me/PlayNixGamesBot" className="hover:text-[var(--color-cream)]" rel="noreferrer">
            {t("footer.telegram")}
          </a>
          {isAdmin(user) && (
            <Link href="/admin" className="hover:text-[var(--color-cream)]">
              {t("profile.adminPanel")}
            </Link>
          )}
        </nav>
        <p className="mb-1">{t("footer.legal")}</p>
        <p>© {new Date().getFullYear()} Playnix</p>
      </footer>

      <BottomNav />
    </div>
  );
}
