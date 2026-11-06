import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export type StoredImage = { url: string; width: number; height: number; bytes: number };

async function sha256Hex(data: Buffer | string): Promise<string> {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function hmac(key: Buffer | string, data: string): Promise<Buffer> {
  return crypto.createHmac("sha256", key).update(data).digest();
}

/** Minimal AWS SigV4 PUT for S3-compatible object storage. */
async function putToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  const s3 = env.s3;
  if (!s3) throw new UploadError("Object storage is not configured.", 501);

  const endpoint = new URL(s3.endpoint);
  const host = endpoint.host;
  const region = process.env.S3_REGION ?? "auto";
  const canonicalUri = `/${s3.bucket}/${key}`.split("/").map(encodeURIComponent).join("/").replace(/%2F/g, "/");
  const now = new Date();
  const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, "")}`;
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

  const kDate = await hmac(`AWS4${s3.secretAccessKey}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = (await hmac(kSigning, stringToSign)).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${s3.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`${endpoint.origin}${canonicalUri}`, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Content-Type": contentType,
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    throw new UploadError(`Object storage rejected the upload (${response.status}).`, 502);
  }
  return `${s3.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
}

/**
 * Validates and stores an admin image upload.
 * Images are re-encoded server-side (strips EXIF / prevents polyglot files).
 */
export async function storeImage(file: File, prefix = "games"): Promise<StoredImage> {
  if (!ALLOWED.has(file.type)) {
    throw new UploadError("Only JPEG, PNG, WebP, AVIF or GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Images must be smaller than 5 MB.");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  if (inputBuffer.byteLength > MAX_BYTES) throw new UploadError("Images must be smaller than 5 MB.");

  let output: Buffer;
  let width = 0;
  let height = 0;
  let extension = "webp";
  let contentType = "image/webp";

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const image = sharp(inputBuffer, { failOn: "error" });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("No image dimensions");
    const resized = await image
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer({ resolveWithObject: true });
    output = resized.data;
    width = resized.info.width;
    height = resized.info.height;
  } catch {
    throw new UploadError("That file could not be read as an image.");
  }

  const key = `${prefix}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;

  if (env.s3) {
    const url = await putToS3(key, output, contentType);
    return { url, width, height, bytes: output.byteLength };
  }

  const target = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, output);
  return { url: `/uploads/${key}`, width, height, bytes: output.byteLength };
}
