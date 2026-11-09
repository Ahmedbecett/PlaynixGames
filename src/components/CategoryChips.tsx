import Link from "next/link";

export type CategoryChipData = { slug: string; name: string; icon: string; gameCount: number };

export function CategoryChips({
  categories,
  activeSlug,
  allLabel,
}: {
  categories: CategoryChipData[];
  activeSlug?: string;
  allLabel?: string;
}) {
  if (categories.length === 0) return null;
  return (
    <div className="scroll-x -mx-1 mb-4 px-1">
      <Link href="/categories" className="chip" data-active={!activeSlug}>
        {allLabel ?? "All"}
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/category/${category.slug}`}
          className="chip"
          data-active={activeSlug === category.slug}
        >
          <span aria-hidden>{category.icon}</span>
          {category.name}
          <span className="text-[10px] opacity-60">{category.gameCount}</span>
        </Link>
      ))}
    </div>
  );
}
