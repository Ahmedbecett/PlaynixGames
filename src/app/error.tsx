"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <span
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-2xl"
          style={{ background: "rgba(239,68,68,.14)" }}
          aria-hidden
        >
          ⚠️
        </span>
        <h1 className="text-lg font-extrabold">Something went wrong</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
          Playnix could not finish this request. Try again — if it keeps happening, reopen the Mini App from Telegram.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn btn-sm" onClick={reset}>
            Retry
          </button>
          <Link href="/" className="btn btn-sm btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
