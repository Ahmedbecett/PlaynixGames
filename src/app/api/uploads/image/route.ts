import { NextRequest } from "next/server";
import { HttpError, assertSameOrigin, json, requireUser, route } from "@/lib/api";
import { getDeveloperByUser } from "@/lib/developers";
import { storeImage, UploadError } from "@/lib/storage";
import { consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Image upload for developers (covers and screenshots).
 *
 * Reuses the same hardened pipeline as admin uploads: MIME allow-list, size cap
 * and a server-side re-encode that strips EXIF and neutralises polyglot files.
 * Restricted to accounts that actually have a developer record, so the public
 * internet cannot use us as free image hosting.
 */
export const POST = route(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();

  const developer = await getDeveloperByUser(user.id);
  if (!developer) {
    throw new HttpError(403, "Join the developer programme before uploading assets.", "not_a_developer");
  }
  if (!consume(`dev-upload:${user.id}`, 60, 60 * 60_000).ok) {
    throw new HttpError(429, "Upload limit reached. Try again later.", "rate_limited");
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Attach an image in the 'file' field.", "bad_request");

  try {
    const stored = await storeImage(file, "developer");
    return json({ ok: true, ...stored });
  } catch (error) {
    if (error instanceof UploadError) throw new HttpError(error.status, error.message, "upload_rejected");
    throw error;
  }
});
