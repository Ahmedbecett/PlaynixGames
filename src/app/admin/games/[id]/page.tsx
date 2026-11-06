import { notFound } from "next/navigation";
import Link from "next/link";
import { all, one } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import type { GameRow } from "@/lib/games";
import { GameForm } from "@/components/admin/GameForm";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dict, locale } = await getDictionary();
  const game = await one<GameRow & { category_id: string | null }>("SELECT * FROM games WHERE id = ?", [id]);
  if (!game) notFound();

  const [categories, images] = await Promise.all([
    all<{ id: string; name: string }>("SELECT id, name FROM categories WHERE is_active = 1 ORDER BY sort_order"),
    all<{ image_url: string }>("SELECT image_url FROM game_images WHERE game_id = ? ORDER BY sort_order", [id]),
  ]);

  return (
    <div className="fade-up">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin/games" className="btn btn-sm btn-ghost">
          <Icon name="arrowLeft" size={14} className="flip-x" />
          {dict["admin.games.title"]}
        </Link>
        <h1 className="text-lg font-extrabold">{game.title}</h1>
        <span className="chip">
          {game.verified_at ? `${dict["common.verified"]} · ${formatDate(game.verified_at, locale)}` : dict["admin.games.verify"]}
        </span>
        <Link href={`/game/${game.slug}`} className="btn btn-sm btn-ghost ms-auto">
          <Icon name="external" size={13} />
          {dict["common.learnMore"]}
        </Link>
      </div>

      <div className="rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.5)" }}>
        <GameForm
          categories={categories}
          initial={{
            id: game.id,
            title: game.title,
            slug: game.slug,
            shortDescription: game.short_description ?? "",
            description: game.description ?? "",
            coverUrl: game.cover_url ?? "",
            developer: game.developer ?? "",
            publisher: game.publisher ?? "",
            categoryId: game.category_id ?? "",
            gameUrl: game.game_url ?? "",
            gameType: game.game_type,
            source: game.source ?? "",
            license: game.license ?? "",
            pricingType: game.pricing_type,
            publicationStatus: game.publication_status as "draft",
            featured: Number(game.featured) === 1,
            releasedAt: game.released_at ?? "",
            supportedDevices: game.supported_devices ?? "",
            controls: game.controls ?? "",
            languages: game.languages ?? "",
            orientation: (game.orientation as "any") ?? "any",
            screenshots: images.map((image) => image.image_url),
          }}
        />
      </div>
    </div>
  );
}
