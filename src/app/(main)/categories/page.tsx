import type { Metadata } from "next";
import Link from "next/link";
import { listCategoriesWithCounts } from "@/lib/games";
import { getDictionary, formatNumber } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { dict, locale } = await getDictionary();
  const categories = await listCategoriesWithCounts(locale);

  return (
    <div className="fade-up">
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">{dict["categories.title"]}</h1>
      <p className="mb-5 text-xs text-[var(--color-muted)]">{dict["home.catalogNote"]}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="hover-lift press group relative overflow-hidden rounded-2xl border border-[rgba(139,92,246,.22)] p-4"
            style={{ background: "linear-gradient(155deg,rgba(29,39,64,.9),rgba(17,22,38,.9))" }}
          >
            <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: "rgba(139,92,246,.16)" }}>
              {category.icon}
            </span>
            <span className="block text-sm font-extrabold">{category.name}</span>
            <span className="block text-[11px] text-[var(--color-muted)]">
              {formatNumber(category.gameCount, locale)} {dict["home.stat.games"]}
            </span>
            <span
              className="pointer-events-none absolute -end-6 -top-6 h-16 w-16 rounded-full opacity-0 transition group-hover:opacity-100"
              style={{ background: "radial-gradient(circle,rgba(255,122,24,.45),transparent 70%)" }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
