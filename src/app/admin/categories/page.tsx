import { all } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { CategoryForm } from "@/components/admin/SimpleForms";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; name: string; name_ar: string | null; name_fr: string | null; slug: string; icon: string | null; is_active: number; sort_order: number };

export default async function AdminCategoriesPage() {
  const { dict } = await getDictionary();
  const categories = await all<CategoryRow & { game_count: unknown }>(
    `SELECT c.*, COUNT(g.id) AS game_count FROM categories c LEFT JOIN games g ON g.category_id = c.id
     GROUP BY c.id ORDER BY c.sort_order ASC`,
  );

  return (
    <div className="fade-up space-y-4">
      <h1 className="text-lg font-extrabold">{dict["admin.categories.title"]}</h1>

      <div className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <CategoryForm />
      </div>

      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(139,92,246,.16)] p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
            <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "rgba(139,92,246,.16)" }}>
              {category.icon ?? "🎮"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold">
                {category.name} <span className="text-[var(--color-muted)]">/ {category.name_ar ?? "—"} / {category.name_fr ?? "—"}</span>
              </p>
              <p className="text-[10.5px] text-[var(--color-muted)]">
                {category.slug} · {Number(category.game_count)} games · sort {category.sort_order}
              </p>
            </div>
            <span className="chip">{category.is_active ? "active" : "hidden"}</span>
            <AdminActionButton
              endpoint={`/api/admin/categories/${category.id}`}
              method="DELETE"
              label={dict["common.delete"]}
              variant="danger"
              confirmText={`${dict["common.delete"]} ${category.name}?`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
