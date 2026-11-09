import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDeveloperByUser } from "@/lib/developers";
import { all } from "@/lib/db";
import { Icon } from "@/components/Icons";
import { GameSubmitForm } from "@/components/developers/GameSubmitForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submit a game", robots: { index: false, follow: false } };

export default async function SubmitGamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/developers");

  const developer = await getDeveloperByUser(user.id);
  if (!developer) redirect("/developers");

  if (developer.status !== "approved") {
    return (
      <div className="fade-up mx-auto max-w-lg py-10 text-center">
        <Icon name="clock" size={30} className="mx-auto mb-3" style={{ color: "#FACC15" }} />
        <h1 className="text-lg font-extrabold">Not yet approved</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)]">
          You can submit games once your developer account is approved. We will notify you here and in Telegram.
        </p>
        <Link href="/developers" className="btn btn-sm mt-4">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const categories = await all<{ id: string; name: string }>("SELECT id, name FROM categories ORDER BY sort_order ASC");

  return (
    <div className="fade-up mx-auto max-w-xl py-4">
      <Link href="/developers" className="mb-3 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--color-muted)]">
        <Icon name="arrowLeft" size={14} className="flip-x" /> Dashboard
      </Link>
      <h1 className="text-xl font-extrabold">Submit a game</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
        Everything here is reviewed before it goes live. You can edit and resubmit at any time.
      </p>
      <GameSubmitForm categories={categories} />
    </div>
  );
}
