"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icons";
import { useT } from "./LocaleProvider";

const items: { href: string; icon: IconName; key: "nav.home" | "nav.search" | "nav.categories" | "nav.favorites" | "nav.profile" }[] = [
  { href: "/", icon: "home", key: "nav.home" },
  { href: "/search", icon: "search", key: "nav.search" },
  { href: "/categories", icon: "grid", key: "nav.categories" },
  { href: "/favorites", icon: "heart", key: "nav.favorites" },
  { href: "/profile", icon: "user", key: "nav.profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="bottom-nav" aria-label={t("nav.home")}>
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="nav-item" data-active={active} prefetch={false}>
              <Icon name={item.icon} filled={active && item.icon === "heart"} />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
