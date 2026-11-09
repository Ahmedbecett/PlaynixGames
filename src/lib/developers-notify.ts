/**
 * Notifications for the developer programme.
 *
 * Kept separate from `developers.ts` so the database layer stays free of
 * Telegram side effects: a failed message must never roll back an application.
 */
import { sendMessage } from "./telegram";
import { env } from "./env";
import type { Developer } from "./developers";

/** DMs every configured admin that a new developer applied. Best effort. */
export async function writeDeveloperApplication(developer: Developer): Promise<void> {
  const admins = env.adminTelegramIds;
  if (admins.length === 0) return;

  const lines = [
    "🧑‍💻 <b>New developer application</b>",
    "",
    `<b>${escapeHtml(developer.display_name)}</b>`,
    developer.country ? `Country: ${escapeHtml(developer.country)}` : "",
    developer.studio_url ? `Portfolio: ${escapeHtml(developer.studio_url)}` : "",
    developer.payout_telegram ? `Payout: ${escapeHtml(developer.payout_telegram)}` : "",
    "",
    "Approve it in /admin/developers.",
  ].filter(Boolean);

  await Promise.all(
    admins.map((chatId) =>
      sendMessage(chatId, lines.join("\n"), { parseMode: "HTML" }).catch(() => undefined),
    ),
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
