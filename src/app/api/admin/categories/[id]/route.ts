import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, clientIp, json, parseBody, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { run } from "@/lib/db";
import { categoryInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PUT = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const input = await parseBody(request, categoryInputSchema);
  const changes = await run(
    `UPDATE categories SET slug = ?, name = ?, name_ar = ?, name_fr = ?, description = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?`,
    [
      input.slug,
      input.name,
      input.nameAr || null,
      input.nameFr || null,
      input.description || null,
      input.icon || "🎮",
      input.sortOrder,
      input.isActive ? 1 : 0,
      id,
    ],
  );
  if (changes === 0) throw new HttpError(404, "Category not found.", "not_found");
  await logAdminAction({ adminId: admin.id, action: "category.update", entityType: "category", entityId: id, metadata: { name: input.name }, ip: clientIp(request) });
  return json({ ok: true });
});

export const DELETE = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  await run("DELETE FROM categories WHERE id = ?", [id]);
  await logAdminAction({ adminId: admin.id, action: "category.delete", entityType: "category", entityId: id, ip: clientIp(request) });
  return json({ ok: true });
});
