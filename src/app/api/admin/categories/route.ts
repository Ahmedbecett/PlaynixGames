import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { all, run } from "@/lib/db";
import { nowIso } from "@/lib/time";
import { categoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return json({ categories: await all("SELECT * FROM categories ORDER BY sort_order ASC, name ASC") });
});

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const input = await parseBody(request, categoryInputSchema);
  try {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO categories (id, slug, name, name_ar, name_fr, description, icon, sort_order, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.slug,
        input.name,
        input.nameAr || null,
        input.nameFr || null,
        input.description || null,
        input.icon || "🎮",
        input.sortOrder,
        input.isActive ? 1 : 0,
        nowIso(),
      ],
    );
    await logAdminAction({ adminId: admin.id, action: "category.create", entityType: "category", entityId: id, metadata: { name: input.name }, ip: clientIp(request) });
    return json({ ok: true, id }, 201);
  } catch (error) {
    if (String(error).includes("UNIQUE") || String(error).includes("duplicate key")) {
      throw new HttpError(409, "That slug already exists.", "slug_taken");
    }
    throw error;
  }
});
