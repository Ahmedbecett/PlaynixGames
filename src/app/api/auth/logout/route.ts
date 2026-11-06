import { json, route } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await clearSessionCookie();
  return json({ ok: true });
});
