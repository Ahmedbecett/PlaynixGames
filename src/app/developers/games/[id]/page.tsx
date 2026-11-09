import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { gameReviewHistory, getDeveloperByUser, getOwnedGame } from "@/lib/developers";
import { all } from "@/lib/db";
import { Icon } from "@/components/Icons";
import { DeveloperGameActions } from "@/components/developers/DeveloperGameActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your game", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; color: string; help: string }> = {
  pending: {
    label: "In review",
    color: "#FACC15",
    help: "A moderator is checking that the game loads, is safe, and matches its description.",
  },
  published: {
    label: "Live",
    color: "#22C55E",
    help: "Your game is live on Playnix and playable inside Telegram.",
  },
  rejected: {
    label: "Changes needed",
    color: "#F87171",
    help: "This submission was not approved. Read the reviewer note and resubmit.",
  },
  draft: { label: "Draft", color: "#A1AABD", help: "Withdrawn from review. Resubmit when you are ready." },
  disabled: { label: "Disabled", color: "#F87171", help: "Disabled by the platform. Contact us in Telegram." },
};

export default async function DeveloperGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/developers");

  const developer = await getDeveloperByUser(user.id);
  if (!developer) redirect("/developers");

  const game = await getOwnedGame(developer.id, id);
  if (!game) notFound();

  const [history, screenshots] = await Promise.all([
    gameReviewHistory(game.id),
    all<{ image_url: string }>("SELECT image_url FROM game_images WHERE game_id = ? ORDER BY sort_order ASC", [game.id]),
  ]);
  const status = STATUS[game.publication_status] ?? STATUS.draft;

  return (
    <div className="fade-up mx-auto max-w-xl py-4">
      <Link href="/developers" className="mb-3 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--color-muted)]">
        <Icon name="arrowLeft" size={14} className="flip-x" /> Dashboard
      </Link>

      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.cover_url || "/covers/placeholder.svg"}
          alt=""
          className="h-16 w-24 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">{game.title}</h1>
          <p className="text-[12px] text-[var(--color-muted)]">
            {game.category_name ?? "Uncategorised"} · /{game.slug}
          </p>
          <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold" style={{ color: status.color, background: `${status.color}1f` }}>
            {status.label}
          </span>
        </div>
      </div>

      <p className="mt-3 rounded-xl border border-[rgba(139,92,246,.2)] p-3 text-[12px] leading-relaxed text-[var(--color-muted)]" style={{ background: "rgba(23,30,48,.5)" }}>
        {status.help}
      </p>

      {game.review_note && (
        <div className="mt-3 rounded-xl border border-[rgba(250,204,21,.3)] p-3" style={{ background: "rgba(250,204,21,.07)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#FACC15]">Reviewer note</p>
          <p className="mt-1 text-[12.5px] leading-relaxed">{game.review_note}</p>
        </div>
      )}

      <dl className="mt-4 space-y-2 text-[12.5px]">
        <div className="flex justify-between gap-3 rounded-lg p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
          <dt className="text-[var(--color-muted)]">Game URL</dt>
          <dd className="min-w-0 truncate text-end">{game.game_url}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-lg p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
          <dt className="text-[var(--color-muted)]">Submitted</dt>
          <dd>{game.submitted_at ? new Date(game.submitted_at).toLocaleDateString() : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 rounded-lg p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
          <dt className="text-[var(--color-muted)]">Pricing</dt>
          <dd>{game.pricing_type}</dd>
        </div>
      </dl>

      {game.publication_status === "published" && (
        <Link href={`/game/${game.slug}`} className="btn btn-sm btn-outline mt-4 w-full">
          <Icon name="external" size={14} /> View public page
        </Link>
      )}

      <DeveloperGameActions gameId={game.id} status={game.publication_status} />

      {screenshots.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Screenshots</p>
          <div className="scroll-x">
            {screenshots.map((shot) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={shot.image_url} src={shot.image_url} alt="" className="h-24 rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted)]">Review history</p>
          <ul className="space-y-1.5">
            {history.map((entry, index) => (
              <li key={`${entry.created_at}-${index}`} className="rounded-lg p-2.5 text-[12px]" style={{ background: "rgba(23,30,48,.5)" }}>
                <span className="font-bold capitalize">{entry.action.replace("_", " ")}</span>
                <span className="text-[var(--color-muted)]"> · {new Date(entry.created_at).toLocaleString()}</span>
                {entry.note && <p className="mt-0.5 text-[var(--color-muted)]">{entry.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
