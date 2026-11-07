import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, requireAdmin, route } from "@/lib/api";
import { logAdminAction } from "@/lib/audit";
import { storeImage, UploadError } from "@/lib/storage";
import { consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  if (!consume(`upload:${admin.id}`, 30, 60 * 60_000).ok) {
    throw new HttpError(429, "Upload limit reached. Try again later.", "rate_limited");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach an image in the 'file' field.", "bad_request");

  try {
    const stored = await storeImage(file, "games");
    await logAdminAction({
      adminId: admin.id,
      action: "asset.upload",
      entityType: "asset",
      metadata: { url: stored.url, bytes: stored.bytes },
    });
    return json({ ok: true, ...stored });
  } catch (error) {
    if (error instanceof UploadError) throw new HttpError(error.status, error.message, "upload_rejected");
    throw error;
  }
});
