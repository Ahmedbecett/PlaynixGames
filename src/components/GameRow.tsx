import Link from "next/link";
import type { GameCard as GameCardData } from "@/lib/games";
import { GameCard } from "./GameCard";
import { Icon } from "./Icons";
import { getDictionary } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dictionary";

export async function SectionHeader({
  titleKey,
  href,
  subtitle,
}: {
  titleKey: DictKey;
  href?: string;
  subtitle?: string;
}) {
  const { dict } = await getDictionary();
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight sm:text-lg">{dict[titleKey]}</h2>
        {subtitle && <p className="text-[11px] text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-bold text-[var(--color-cyan)]">
          {dict["common.viewAll"]}
          <Icon name="chevronRight" size={13} className="flip-x" />
        </Link>
      )}
    </div>
  );
}

export async function GameRow({
  titleKey,
  games,
  href,
  favoriteIds = new Set<string>(),
  canFavorite = false,
  lockedIds = new Set<string>(),
  track = "row",
}: {
  titleKey: DictKey;
  games: GameCardData[];
  href?: string;
  favoriteIds?: Set<string>;
  canFavorite?: boolean;
  lockedIds?: Set<string>;
  track?: string;
}) {
  if (games.length === 0) return null;
  return (
    <section className="mb-5" aria-labelledby={`row-${titleKey}`}>
      <div id={`row-${titleKey}`}>
        <SectionHeader titleKey={titleKey} href={href} />
      </div>
      <div className="scroll-x" data-track={track}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            variant="row"
            canFavorite={canFavorite}
            initiallyFavorite={favoriteIds.has(game.id)}
            locked={lockedIds.has(game.id)}
          />
        ))}
      </div>
    </section>
  );
}
