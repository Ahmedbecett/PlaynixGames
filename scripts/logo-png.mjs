// Renders the SVG brand assets to PNG (bot avatar, app icons, favicon).
import sharp from "sharp";
import { readFileSync } from "node:fs";

const mark = readFileSync("public/brand/logo-mark.svg");
const full = readFileSync("public/brand/logo-full.svg");

const jobs = [
  { input: mark, out: "public/brand/icon-512.png", width: 512 },
  { input: mark, out: "public/brand/icon-192.png", width: 192 },
  { input: mark, out: "public/brand/logo-mark-1024.png", width: 1024 },
  { input: full, out: "public/brand/logo-full.png", width: 840 },
];

for (const job of jobs) {
  await sharp(job.input, { density: 384 }).resize({ width: job.width }).png({ compressionLevel: 9 }).toFile(job.out);
  console.log("rendered", job.out);
}

// Favicon (32px)
await sharp(mark, { density: 384 }).resize({ width: 32 }).png().toFile("src/app/favicon.png");
console.log("rendered src/app/favicon.png");
