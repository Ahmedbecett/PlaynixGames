import { all } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { GameForm } from "@/components/admin/GameForm";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const { dict } = await getDictionary();
  const categories = await all<{ id: string; name: string }>("SELECT id, name FROM categories WHERE is_active = 1 ORDER BY sort_order");

  return (
    <div className="fade-up">
      <h1 className="mb-4 text-lg font-extrabold">{dict["admin.games.new"]}</h1>
      <div className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <GameForm categories={categories} />
      </div>
    </div>
  );
}
