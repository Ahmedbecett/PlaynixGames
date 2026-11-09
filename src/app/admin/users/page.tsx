import Link from "next/link";
import { all } from "@/lib/db";
import { getDictionary, formatDate } from "@/lib/i18n";
import { AdminActionButton } from "@/components/admin/AdminActionButton";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

type UserRow = {
  id: string;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
  language: string;
  role: string;
  status: string;
  created_at: string;
  last_seen_at: string | null;
  telegram_id: string;
  plays: unknown;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { dict, locale } = await getDictionary();

  // Conditional WHERE instead of `? IS NULL`: PostgreSQL rejects a NULL
  // parameter without a type context, and LOWER() keeps the match
  // case-insensitive on both SQLite (always) and PostgreSQL (by default not).
  const needle = (q ?? "").trim();
  const users = needle
    ? await all<UserRow>(
        `SELECT u.*, (SELECT COUNT(*) FROM play_history p WHERE p.user_id = u.id) AS plays
         FROM users u
         WHERE LOWER(u.username) LIKE LOWER(?) OR LOWER(u.first_name) LIKE LOWER(?)
            OR u.telegram_id LIKE ?
         ORDER BY u.created_at DESC LIMIT 200`,
        [`%${needle}%`, `%${needle}%`, `%${needle}%`],
      )
    : await all<UserRow>(
        `SELECT u.*, (SELECT COUNT(*) FROM play_history p WHERE p.user_id = u.id) AS plays
         FROM users u
         ORDER BY u.created_at DESC LIMIT 200`,
      );

  return (
    <div className="fade-up">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-extrabold">{dict["admin.users.title"]}</h1>
        <span className="chip">{users.length}</span>
        <form className="ms-auto flex gap-2" action="/admin/users">
          <input name="q" defaultValue={q ?? ""} className="input h-9 max-w-[220px]" placeholder={dict["common.search"]} />
          <button className="btn btn-sm">{dict["common.search"]}</button>
        </form>
      </div>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[rgba(161,170,189,.25)] p-6 text-center text-sm text-[var(--color-muted)]">
          {dict["admin.users.empty"]}
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(139,92,246,.16)] p-2.5" style={{ background: "rgba(23,30,48,.5)" }}>
              <Avatar photoUrl={user.photo_url} name={user.first_name} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">
                  {user.first_name ?? "Player"} {user.username ? <span className="text-[var(--color-muted)]">@{user.username}</span> : null}
                </p>
                <p className="text-[10.5px] text-[var(--color-muted)]">
                  tg:{user.telegram_id} · {user.language.toUpperCase()} · {Number(user.plays)} plays · joined {formatDate(user.created_at, locale)}
                </p>
              </div>
              <span className="chip">{user.role}</span>
              <span className="chip" style={{ color: user.status === "active" ? "var(--color-success)" : "var(--color-danger)" }}>
                {user.status}
              </span>
              {user.status === "active" ? (
                <AdminActionButton
                  endpoint={`/api/admin/users/${user.id}`}
                  label={dict["admin.users.suspend"]}
                  body={{ status: "suspended", reason: "Policy violation" }}
                  confirmText={`${dict["admin.users.suspend"]} ${user.first_name ?? user.username}?`}
                  variant="danger"
                />
              ) : (
                <AdminActionButton endpoint={`/api/admin/users/${user.id}`} label={dict["admin.users.restore"]} body={{ status: "active" }} />
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-[var(--color-muted)]">
        <Link href="/admin/logs" className="text-[var(--color-cyan)]">{dict["admin.logs.title"]}</Link>
      </p>
    </div>
  );
}
