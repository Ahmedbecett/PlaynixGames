import Link from "next/link";
import { getDictionary, formatNumber } from "@/lib/i18n";
import { listAdminGames } from "@/lib/admin-games";
import { Icon } from "@/components/Icons";
import { AdminActionButton } from "@/components/admin/AdminActionButton";

export const dynamic = "force-dynamic";

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const { dict, locale } = await getDictionary();
  const games = await listAdminGames({ query: params.q, status: params.status });

  const statuses = ["", "draft", "pending", "approved", "published", "rejected", "disabled"];

  return (
    <div className="fade-up">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-extrabold">{dict["admin.games.title"]}</h1>
        <span className="chip">{games.length}</span>
        <Link href="/admin/games/new" className="btn btn-sm ms-auto">
          <Icon name="plus" size={14} /> {dict["admin.games.new"]}
        </Link>
      </div>

      <form className="mb-3 flex flex-wrap gap-2" action="/admin/games">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder={dict["admin.games.searchPlaceholder"]}
          className="input h-9 max-w-xs flex-1"
        />
        <select name="status" defaultValue={params.status ?? ""} className="select h-9 w-auto text-xs">
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status || dict["common.all"]}
            </option>
          ))}
        </select>
        <button className="btn btn-sm">{dict["common.search"]}</button>
      </form>

      {games.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(161,170,189,.25)] p-6 text-center text-sm text-[var(--color-muted)]">
          {dict["admin.games.empty"]}
        </p>
      ) : (
        <ul className="space-y-2">
          {games.map((game) => (
            <li
              key={game.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(139,92,246,.18)] p-2.5"
              style={{ background: "rgba(23,30,48,.55)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.cover_url || "/covers/placeholder.svg"} alt="" className="h-12 w-20 rounded-lg object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">{game.title}</p>
                <p className="text-[10.5px] text-[var(--color-muted)]">
                  {game.category_name ?? "—"} · {game.pricing_type} · {game.game_type} · {formatNumber(Number(game.play_count), locale)} plays
                </p>
              </div>
              <span
                className="chip"
                style={{
                  color:
                    game.publication_status === "published"
                      ? "var(--color-success)"
                      : game.publication_status === "rejected"
                        ? "var(--color-danger)"
                        : "var(--color-orange)",
                }}
              >
                {game.publication_status}
              </span>
              {game.verified_at ? (
                <span className="chip" style={{ color: "var(--color-cyan)" }}>
                  <Icon name="shield" size={11} /> {dict["common.verified"]}
                </span>
              ) : (
                <span className="chip" style={{ color: "var(--color-muted)" }}>
                  {dict["admin.games.verify"]}
                </span>
              )}
              <div className="flex gap-1.5">
                <Link href={`/admin/games/${game.id}`} className="btn btn-sm btn-ghost">
                  {dict["common.learnMore"]}
                </Link>
                <AdminActionButton
                  endpoint={`/api/admin/games/${game.id}/verify`}
                  method="POST"
                  label={dict["admin.games.verify"]}
                  variant="outline"
                />
                <AdminActionButton
                  endpoint={`/api/admin/games/${game.id}`}
                  method="DELETE"
                  label={dict["common.delete"]}
                  variant="danger"
                  confirmText={dict["admin.games.deleteConfirm"]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
