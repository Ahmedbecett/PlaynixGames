/**
 * Environment access. Secrets are only ever read on the server.
 * Nothing here is imported by client components.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export const env = {
  get appUrl(): string {
    return (optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get botToken(): string | undefined {
    return optional("TELEGRAM_BOT_TOKEN");
  },
  get botUsername(): string {
    return optional("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME") ?? "";
  },
  get webhookSecret(): string | undefined {
    return optional("TELEGRAM_WEBHOOK_SECRET");
  },
  get sessionSecret(): string {
    const secret = optional("SESSION_SECRET");
    if (secret && secret.length >= 16) return secret;
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required in production (min 16 chars).");
    }
    // Development fallback only. Never used in production.
    return "playnix-development-session-secret-change-me";
  },
  get adminTelegramIds(): string[] {
    return (optional("ADMIN_TELEGRAM_IDS") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  },
  get databaseUrl(): string | undefined {
    return optional("DATABASE_URL");
  },
  get sqlitePath(): string {
    return optional("SQLITE_PATH") ?? "./data/playnix.db";
  },
  get allowDevLogin(): boolean {
    return optional("ALLOW_DEV_LOGIN") === "true" && process.env.NODE_ENV !== "production";
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
  get s3(): {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl: string;
  } | null {
    const endpoint = optional("S3_ENDPOINT");
    const bucket = optional("S3_BUCKET");
    const accessKeyId = optional("S3_ACCESS_KEY_ID");
    const secretAccessKey = optional("S3_SECRET_ACCESS_KEY");
    const publicBaseUrl = optional("S3_PUBLIC_BASE_URL");
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl) return null;
    return { endpoint, bucket, accessKeyId, secretAccessKey, publicBaseUrl };
  },
  get botConfigured(): boolean {
    return Boolean(optional("TELEGRAM_BOT_TOKEN"));
  },
};

/** Redacted view of the configuration, safe to render in the admin system panel. */
export function configStatus() {
  return [
    { key: "telegram_bot", ok: env.botConfigured, detail: env.botConfigured ? "token configured" : "TELEGRAM_BOT_TOKEN missing" },
    { key: "webhook_secret", ok: Boolean(env.webhookSecret), detail: env.webhookSecret ? "configured" : "TELEGRAM_WEBHOOK_SECRET missing" },
    { key: "session_secret", ok: Boolean(optional("SESSION_SECRET")), detail: optional("SESSION_SECRET") ? "configured" : "using development fallback" },
    { key: "admins", ok: env.adminTelegramIds.length > 0, detail: `${env.adminTelegramIds.length} admin id(s) allowlisted` },
    { key: "database", ok: true, detail: env.databaseUrl ? "postgres" : "sqlite (local)" },
    { key: "object_storage", ok: Boolean(env.s3), detail: env.s3 ? "S3 configured" : "local disk uploads" },
  ];
}
