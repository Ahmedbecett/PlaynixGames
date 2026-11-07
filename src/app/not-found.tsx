import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { Icon } from "@/components/Icons";

export default async function NotFound() {
  const { dict } = await getDictionary();
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "rgba(139,92,246,.16)" }}>
          <Icon name="gamepad" size={26} style={{ color: "var(--color-violet)" }} />
        </span>
        <h1 className="text-xl font-extrabold">{dict["errors.notFound"]}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{dict["game.notFoundBody"]}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/" className="btn btn-sm">
            {dict["nav.home"]}
          </Link>
          <Link href="/search" className="btn btn-sm btn-ghost">
            {dict["common.search"]}
          </Link>
        </div>
      </div>
    </div>
  );
}
