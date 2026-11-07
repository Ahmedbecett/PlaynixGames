import { NextRequest } from "next/server";
import { z } from "zod";
import { json, parseBody, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { LOCALE_COOKIE, locales } from "@/lib/i18n";
import { nowIso } from "@/lib/time";

const schema = z.object({ locale: z.enum(locales as [string, ...string[]]) });

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  const { locale } = await parseBody(request, schema);
  const user = await getCurrentUser();
  if (user) {
    await run("UPDATE users SET language = ?, updated_at = ? WHERE id = ?", [locale, nowIso(), user.id]);
  }
  const response = json({ ok: true, locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
});
