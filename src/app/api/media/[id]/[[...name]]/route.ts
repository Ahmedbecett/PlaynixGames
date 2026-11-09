import { NextRequest, NextResponse } from "next/server";
import { readMedia } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves a developer image that could not be written to disk.
 *
 * On Vercel the filesystem is read-only, so `public/uploads` only works
 * locally; these bytes live in `media_assets` instead. The trailing path
 * segment is ignored — it exists so the URL keeps a readable filename.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const media = await readMedia(id);
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(media.data), {
    headers: {
      "content-type": media.contentType,
      "content-length": String(media.data.byteLength),
      // Content-addressed by an unguessable uuid and never rewritten.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
