import { NextRequest } from "next/server";
import { z } from "zod";
import { HttpError, assertSameOrigin, json, parseBody, requireAdmin, route } from "@/lib/api";
import { getDeveloperById, setDeveloperStatus } from "@/lib/developers";
import { logAdminAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["approved", "rejected", "suspended", "pending"]) });

/** POST — change a developer account's status. */
export const POST = route(async (request: NextRequest, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const input = await parseBody(request, schema);

  const developer = await getDeveloperById(id);
  if (!developer) throw new HttpError(404, "Developer not found.", "not_found");

  await setDeveloperStatus(id, input.status);
  await logAdminAction({
    adminId: admin.id,
    action: `developer.${input.status}`,
    entityType: "developer",
    entityId: id,
    metadata: { displayName: developer.display_name },
  });

  return json({ ok: true, status: input.status });
});
