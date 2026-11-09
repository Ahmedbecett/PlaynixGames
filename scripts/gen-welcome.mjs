/**
 * Renders the bot's branded artwork (vector → JPEG with sharp).
 *
 *   node scripts/gen-welcome.mjs
 *
 * Output:
 *   public/brand/welcome.jpg  — the picture sent with the bot's /start message
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 1280;
const H = 720;
const OUT = path.resolve("public/brand");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="52%" stop-color="#090B14"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0.42"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.7">
      <stop offset="0%" stop-color="#FF7A18" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#FF7A18" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="70%" stop-color="#22D3EE"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF7A18"/>
      <stop offset="100%" stop-color="#FFB35C"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${Array.from({ length: 15 }, (_, i) => `<line x1="0" y1="${i * 48}" x2="${W}" y2="${i * 48}" stroke="rgba(139,92,246,0.07)" stroke-width="1"/>`).join("")}
  ${Array.from({ length: 27 }, (_, i) => `<line x1="${i * 48}" y1="0" x2="${i * 48}" y2="${H}" stroke="rgba(139,92,246,0.07)" stroke-width="1"/>`).join("")}

  <!-- premium card cluster -->
  <g transform="translate(760 150)">
    <rect x="0" y="60" width="200" height="270" rx="26" fill="#141c2e" stroke="rgba(34,211,238,0.55)" stroke-width="3" transform="rotate(-10 100 195)"/>
    <rect x="120" y="30" width="200" height="270" rx="26" fill="#161f34" stroke="rgba(255,122,24,0.65)" stroke-width="3" transform="rotate(6 220 165)"/>
    <rect x="250" y="80" width="200" height="270" rx="26" fill="#141c2e" stroke="rgba(139,92,246,0.6)" stroke-width="3" transform="rotate(15 350 215)"/>
    <text x="100" y="228" font-family="sans-serif" font-size="96" fill="#22D3EE" text-anchor="middle" transform="rotate(-10 100 195)">♟</text>
    <text x="220" y="198" font-family="sans-serif" font-size="96" fill="#FF7A18" text-anchor="middle" transform="rotate(6 220 165)">♞</text>
    <text x="350" y="248" font-family="sans-serif" font-size="96" fill="#8B5CF6" text-anchor="middle" transform="rotate(15 350 215)">♠</text>
  </g>

  <text x="80" y="150" font-family="sans-serif" font-size="24" font-weight="bold" letter-spacing="8" fill="#22D3EE">PLAYNIX · TELEGRAM MINI APP</text>
  <text x="78" y="300" font-family="sans-serif" font-size="104" font-weight="bold" fill="url(#title)">Playnix</text>
  <text x="80" y="372" font-family="sans-serif" font-size="38" font-weight="bold" fill="#F8FAFC">16 games. Zero installs.</text>
  <text x="80" y="422" font-family="sans-serif" font-size="28" fill="#A1AABD">Tap, play, and keep your progress inside Telegram.</text>

  <rect x="80" y="470" width="430" height="86" rx="43" fill="url(#pill)"/>
  <text x="295" y="524" font-family="sans-serif" font-size="32" font-weight="bold" letter-spacing="2" fill="#1a0f04" text-anchor="middle">PREMIUM · STARS</text>

  <g>
    <text x="80" y="628" font-family="sans-serif" font-size="24" fill="#F8FAFC">★ Unlock the premium collection</text>
    <text x="80" y="670" font-family="sans-serif" font-size="24" fill="#8FA2C8">★ Cancel anytime · paid with Telegram Stars</text>
  </g>

  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="rgba(139,92,246,0.30)" stroke-width="4"/>
</svg>`;

fs.mkdirSync(OUT, { recursive: true });
const target = path.join(OUT, "welcome.jpg");
await sharp(Buffer.from(svg)).jpeg({ quality: 88, progressive: true }).toFile(target);
console.log(`✓ ${path.relative(process.cwd(), target)}`);
