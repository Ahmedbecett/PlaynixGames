/**
 * Builds the Open Graph / Twitter share card (1200×630) used for link
 * previews in Telegram, X, WhatsApp, Facebook, LinkedIn and Google.
 *
 *   npm run og:image
 *
 * Output: public/brand/og-1200x630.png
 */
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1020"/>
      <stop offset="0.55" stop-color="#090B14"/>
      <stop offset="1" stop-color="#120A22"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0.15" cy="0.1" r="0.75">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.95" cy="0.95" r="0.7">
      <stop offset="0" stop-color="#FF7A18" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#FF7A18" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowC" cx="0.85" cy="0.05" r="0.5">
      <stop offset="0" stop-color="#22D3EE" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8B5CF6"/>
      <stop offset="0.55" stop-color="#22D3EE"/>
      <stop offset="1" stop-color="#FF7A18"/>
    </linearGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#F5F1E8"/>
      <stop offset="0.6" stop-color="#E7DDFF"/>
      <stop offset="1" stop-color="#8FE9F7"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#22D3EE" stop-opacity="0.22"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowA)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowB)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowC)"/>

  <!-- subtle grid -->
  <g stroke="#8B5CF6" stroke-opacity="0.07" stroke-width="1">
    ${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 52}" y1="0" x2="${i * 52}" y2="${HEIGHT}"/>`).join("")}
    ${Array.from({ length: 13 }, (_, i) => `<line x1="0" y1="${i * 52}" x2="${WIDTH}" y2="${i * 52}"/>`).join("")}
  </g>

  <!-- logo mark -->
  <g transform="translate(84,92)">
    <rect width="104" height="104" rx="28" fill="url(#mark)"/>
    <rect x="12" y="12" width="80" height="80" rx="22" fill="#090B14" fill-opacity="0.55"/>
    <path d="M40 34 L78 52 L40 70 Z" fill="#FFB35C"/>
  </g>

  <text x="212" y="140" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="46" font-weight="800" fill="#F5F1E8" letter-spacing="-1">Playnix</text>
  <text x="212" y="180" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="23" font-weight="600" fill="#8FA0C0">Gaming search engine · Telegram Mini App</text>

  <!-- headline -->
  <text x="84" y="330" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="72" font-weight="800" fill="url(#title)" letter-spacing="-2">Thousands of games.</text>
  <text x="84" y="412" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="72" font-weight="800" fill="url(#title)" letter-spacing="-2">One tap to play.</text>

  <text x="86" y="470" font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
        font-size="27" font-weight="500" fill="#A8B4CC">No installs, no APKs — play instantly inside Telegram.</text>

  <!-- pills -->
  <g font-family="Inter, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="21" font-weight="700">
    <rect x="84" y="512" width="196" height="60" rx="30" fill="url(#pill)" stroke="#8B5CF6" stroke-opacity="0.5"/>
    <text x="182" y="551" fill="#EDE7FF" text-anchor="middle">HTML5 games</text>

    <rect x="298" y="512" width="182" height="60" rx="30" fill="url(#pill)" stroke="#22D3EE" stroke-opacity="0.5"/>
    <text x="389" y="551" fill="#D9F7FF" text-anchor="middle">Free to play</text>

    <rect x="498" y="512" width="234" height="60" rx="30" fill="url(#pill)" stroke="#FF7A18" stroke-opacity="0.5"/>
    <text x="615" y="551" fill="#FFE7D2" text-anchor="middle">Verified catalog</text>
  </g>

  <!-- decorative gamepad -->
  <g transform="translate(940,300)" opacity="0.95">
    <circle cx="90" cy="96" r="128" fill="#8B5CF6" fill-opacity="0.18" filter="url(#soft)"/>
    <g transform="rotate(-12 90 96)">
      <rect x="-6" y="24" width="192" height="120" rx="60" fill="url(#mark)" fill-opacity="0.9"/>
      <rect x="6" y="36" width="168" height="96" rx="48" fill="#0C1222" fill-opacity="0.72"/>
      <g fill="#F5F1E8">
        <rect x="46" y="76" width="12" height="36" rx="6"/>
        <rect x="34" y="88" width="36" height="12" rx="6"/>
      </g>
      <circle cx="124" cy="80" r="9" fill="#22D3EE"/>
      <circle cx="146" cy="102" r="9" fill="#FF7A18"/>
      <circle cx="124" cy="124" r="9" fill="#8B5CF6" fill-opacity="0.9"/>
    </g>
  </g>

  <rect x="0" y="${HEIGHT - 8}" width="${WIDTH}" height="8" fill="url(#mark)"/>
</svg>
`;

const out = "public/brand/og-1200x630.png";
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
const meta = await sharp(out).metadata();
console.log(`[playnix] wrote ${out} (${meta.width}×${meta.height}, ${meta.format})`);
