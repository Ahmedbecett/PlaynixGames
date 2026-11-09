import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import { getDictionary } from "@/lib/i18n";

export const adminNav: { href: string; key: string; icon: IconName }[] = [
  { href: "/admin", key: "admin.nav.dashboard", icon: "chart" },
  { href: "/admin/games", key: "admin.nav.games", icon: "gamepad" },
  { href: "/admin/developers", key: "admin.nav.developers", icon: "code" },
  { href: "/admin/categories", key: "admin.nav.categories", icon: "grid" },
  { href: "/admin/users", key: "admin.nav.users", icon: "users" },
  { href: "/admin/reviews", key: "admin.nav.reviews", icon: "star" },
  { href: "/admin/reports", key: "admin.nav.reports", icon: "flag" },
  { href: "/admin/ads", key: "admin.nav.ads", icon: "bolt" },
  { href: "/admin/plans", key: "admin.nav.plans", icon: "crown" },
  { href: "/admin/announcements", key: "admin.nav.announcements", icon: "bell" },
  { href: "/admin/logs", key: "admin.nav.logs", icon: "clock" },
  { href: "/admin/system", key: "admin.nav.system", icon: "settings" },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const { dict } = await getDictionary();
  return (
    <div className="app-shell">
      <header
        className="safe-top sticky top-0 z-40"
        style={{ background: "rgba(9,11,20,.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(139,92,246,.18)" }}
      >
        <div className="page flex items-center gap-3 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.svg" alt="" width={32} height={32} className="rounded-lg" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-tight">{dict["admin.title"]}</p>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Playnix control room</p>
          </div>
          <Link href="/" className="btn btn-sm btn-ghost ms-auto">
            <Icon name="arrowLeft" size={14} className="flip-x" />
            Mini App
          </Link>
        </div>
        <nav className="page flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }} aria-label={dict["admin.title"]}>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className="chip shrink-0">
              <Icon name={item.icon} size={13} />
              {dict[item.key as keyof typeof dict]}
            </Link>
          ))}
        </nav>
      </header>
      <main className="page flex-1 py-4">{children}</main>
    </div>
  );
}

export function AdminGate({ mode, dict }: { mode: "signin" | "forbidden"; dict: Record<string, string> }) {
  return (
    <div className="grid min-h-[80vh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "rgba(239,68,68,.12)" }}>
          <Icon name="shield" size={26} style={{ color: "var(--color-danger)" }} />
        </span>
        <h1 className="text-lg font-extrabold">{mode === "signin" ? dict["errors.unauthorized"] : dict["admin.forbidden"]}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
          {mode === "signin" ? dict["profile.notSignedInBody"] : dict["admin.forbiddenBody"]}
        </p>
        <Link href="/" className="btn mt-4">
          {dict["nav.home"]}
        </Link>
      </div>
    </div>
  );
}
