import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDeveloperByUser, listDeveloperGames } from "@/lib/developers";
import { getDictionary } from "@/lib/i18n";
import { Icon } from "@/components/Icons";
import { DeveloperApplyForm } from "@/components/developers/DeveloperApplyForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Developer dashboard", robots: { index: false, follow: false } };

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  pending: { label: "In review", color: "#FACC15" },
  approved: { label: "Approved", color: "#22D3EE" },
  published: { label: "Live", color: "#22C55E" },
  rejected: { label: "Needs changes", color: "#F87171" },
  draft: { label: "Draft", color: "#A1AABD" },
  disabled: { label: "Disabled", color: "#F87171" },
};

export default async function DevelopersPage() {
  const { dict } = await getDictionary();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="fade-up mx-auto max-w-lg py-10 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "rgba(139,92,246,.16)" }}>
          <Icon name="code" size={28} style={{ color: "var(--color-violet)" }} />
        </span>
        <h1 className="text-xl font-extrabold">Publish your game on Playnix</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          Playnix is open to outside developers. Sign in with Telegram to apply, upload a build, and ship to
          players inside the Mini App — leaderboards, achievements and cloud saves included.
        </p>
        <Link href="/" className="btn mt-5">
          <Icon name="play" size={15} filled /> Open Playnix in Telegram
        </Link>
      </div>
    );
  }

  const developer = await getDeveloperByUser(user.id);

  if (!developer) {
    return (
      <div className="fade-up mx-auto max-w-lg py-8">
        <h1 className="text-xl font-extrabold">Become a Playnix developer</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          Tell us who you are. Once approved you can upload games, track their review status and ship updates.
        </p>
        <DeveloperApplyForm />
      </div>
    );
  }

  const games = await listDeveloperGames(developer.id);
  const counts = games.reduce<Record<string, number>>((acc, game) => {
    acc[game.publication_status] = (acc[game.publication_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fade-up py-4">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--color-cyan)]">Developer</p>
          <h1 className="text-xl font-extrabold">{developer.display_name}</h1>
          <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
            Revenue share <b className="text-[var(--color-text)]">{developer.revenue_share}%</b> · Status{" "}
            <b style={{ color: developer.status === "approved" ? "#22C55E" : "#FACC15" }}>{developer.status}</b>
          </p>
        </div>
        {developer.status === "approved" && (
          <Link href="/developers/submit" className="btn">
            <Icon name="plus" size={15} /> Submit a game
          </Link>
        )}
      </div>

      {developer.status === "pending" && (
        <div className="mb-5 rounded-2xl border border-[rgba(250,204,21,.35)] p-4" style={{ background: "rgba(250,204,21,.07)" }}>
          <p className="text-[13px] font-bold">Your application is being reviewed</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
            We check every account before it can publish. You will get a notification here and in Telegram.
          </p>
        </div>
      )}

      {developer.status === "rejected" && (
        <div className="mb-5 rounded-2xl border border-[rgba(248,113,113,.35)] p-4" style={{ background: "rgba(248,113,113,.07)" }}>
          <p className="text-[13px] font-bold">Your application was not approved</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
            Reply in Telegram if you think this was a mistake — we can take another look.
          </p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: games.length },
          { label: "Live", value: counts.published ?? 0 },
          { label: "In review", value: counts.pending ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[rgba(139,92,246,.2)] p-3 text-center" style={{ background: "rgba(23,30,48,.55)" }}>
            <p className="text-lg font-extrabold">{stat.value}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-[var(--color-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(139,92,246,.35)] p-8 text-center">
          <p className="text-[13.5px] font-bold">No games yet</p>
          <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-[var(--color-muted)]">
            Submit your first HTML5 game. It goes into the review queue, and once approved it is live for every
            Playnix player.
          </p>
          {developer.status === "approved" && (
            <Link href="/developers/submit" className="btn btn-sm mt-4">
              <Icon name="plus" size={14} /> Submit a game
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {games.map((game) => {
            const status = STATUS_STYLE[game.publication_status] ?? STATUS_STYLE.draft;
            return (
              <li key={game.id}>
                <Link
                  href={`/developers/games/${game.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[rgba(139,92,246,.18)] p-3 transition hover:border-[rgba(139,92,246,.42)]"
                  style={{ background: "rgba(23,30,48,.55)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.cover_url || "/covers/placeholder.svg"}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{game.title}</p>
                    <p className="truncate text-[11px] text-[var(--color-muted)]">
                      {game.category_name ?? "Uncategorised"} · /{game.slug}
                    </p>
                    {game.review_note && (
                      <p className="mt-0.5 truncate text-[11px] text-[#FACC15]">Reviewer: {game.review_note}</p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                    style={{ color: status.color, background: `${status.color}1f` }}
                  >
                    {status.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 rounded-2xl border border-[rgba(139,92,246,.2)] p-4" style={{ background: "rgba(23,30,48,.45)" }}>
        <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--color-muted)]">SDK quick start</p>
        <pre className="mt-2 overflow-x-auto rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: "#0b1020", color: "#A5F3FC" }}>
{`<script src="/sdk/playnix-sdk.js"></script>
<script>
  const playnix = Playnix.create({ game: "${"my-game"}" });
  playnix.score(1200);        // leaderboard
  playnix.unlock("first-win"); // achievement
  playnix.save({ level: 3 }); // cloud save
</script>`}
        </pre>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          Full reference: <code>docs/SDK.md</code> in the repository. {dict["common.learnMore"]}
        </p>
      </div>
    </div>
  );
}
