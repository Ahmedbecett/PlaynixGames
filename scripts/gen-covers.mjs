/**
 * Generates the branded cover art for every bundled Playnix Original.
 *
 * Everything is drawn as vector SVG (no external assets, no stock images) and
 * rasterised with sharp, so covers stay reproducible from the repository:
 *
 *   node scripts/gen-covers.mjs            # all games
 *   node scripts/gen-covers.mjs tetra-stack
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const W = 1312;
const H = 816;
const OUT = path.resolve("public/covers");

const BRAND = {
  orange: "#FF7A18",
  cyan: "#22D3EE",
  violet: "#8B5CF6",
  green: "#22C55E",
  gold: "#FACC15",
  red: "#EF4444",
  ink: "#090B14",
  cream: "#F8FAFC",
};

const roundRect = (x, y, w, h, r, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

const games = [
  {
    slug: "tetra-stack",
    title: "Tetra Stack",
    accent: BRAND.violet,
    secondary: BRAND.cyan,
    motif: () => {
      const blocks = [
        [720, 180], [800, 180], [880, 180], [720, 260], [800, 260],
        [980, 260], [1060, 260], [980, 340], [1060, 340], [1140, 340],
        [800, 420], [880, 420], [960, 420], [1040, 420],
      ];
      return blocks
        .map(([x, y], index) =>
          roundRect(x, y, 68, 68, 14, index % 3 === 0 ? BRAND.violet : index % 3 === 1 ? BRAND.cyan : BRAND.orange,
            'opacity="0.92"'),
        )
        .join("");
    },
  },
  {
    slug: "tile-merge",
    title: "Tile Merge",
    accent: BRAND.orange,
    secondary: BRAND.gold,
    motif: () => {
      const values = [
        ["2", 760, 190], ["4", 880, 190], ["8", 760, 310],
        ["16", 880, 310], ["2048", 1000, 430], ["64", 760, 430],
        ["128", 1000, 190], ["8", 1000, 310], ["32", 880, 430],
      ];
      return values
        .map(([label, x, y]) => {
          const size = 100;
          const bg = label === "2048" ? BRAND.orange : label.length > 2 ? BRAND.violet : "#1e2740";
          const ink = label === "2048" ? "#1a0f04" : BRAND.cream;
          return (
            roundRect(x, y, size, size, 20, bg, 'opacity="0.95"') +
            `<text x="${x + size / 2}" y="${y + size / 2 + 14}" font-family="sans-serif" font-size="${label.length > 2 ? 30 : 40}" font-weight="bold" fill="${ink}" text-anchor="middle">${label}</text>`
          );
        })
        .join("");
    },
  },
  {
    slug: "flap-quest",
    title: "Flap Quest",
    accent: BRAND.cyan,
    secondary: BRAND.violet,
    motif: () => `
      ${roundRect(860, 60, 120, 300, 16, BRAND.violet, 'opacity="0.85"')}
      ${roundRect(860, 480, 120, 280, 16, BRAND.violet, 'opacity="0.85"')}
      ${roundRect(1080, 120, 120, 240, 16, BRAND.violet, 'opacity="0.65"')}
      ${roundRect(1080, 480, 120, 280, 16, BRAND.violet, 'opacity="0.65"')}
      <circle cx="1010" cy="410" r="46" fill="${BRAND.orange}"/>
      <circle cx="996" cy="396" r="18" fill="#FFD8AE"/>
      <circle cx="1022" cy="392" r="6" fill="${BRAND.ink}"/>
      <path d="M1052 410 L1092 424 L1052 438 Z" fill="${BRAND.cyan}"/>
    `,
  },
  {
    slug: "maze-escape",
    title: "Maze Escape",
    accent: BRAND.green,
    secondary: BRAND.cyan,
    motif: () => {
      const cells = [];
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const wall = (x * 7 + y * 3) % 5 < 2 || (x === 0 && y === 0);
          if (!wall) continue;
          cells.push(roundRect(760 + x * 62, 150 + y * 62, 56, 56, 8, "rgba(139,92,246,0.28)"));
        }
      }
      return (
        cells.join("") +
        `<circle cx="${760 + 1.5 * 62}" cy="${150 + 6.5 * 62}" r="17" fill="${BRAND.orange}"/>` +
        roundRect(760 + 6 * 62, 150 + 1 * 62, 56, 56, 12, BRAND.cyan, 'opacity="0.9"')
      );
    },
  },
  {
    slug: "penalty-shot",
    title: "Penalty Shot",
    accent: BRAND.green,
    secondary: BRAND.cream,
    motif: () => `
      <rect x="800" y="150" width="420" height="300" fill="none" stroke="${BRAND.cream}" stroke-width="12"/>
      <path d="M800 150 L1220 150 M800 450 L1220 450" stroke="${BRAND.cream}" stroke-width="12"/>
      ${Array.from({ length: 6 }, (_, i) => `<line x1="${800 + i * 84}" y1="150" x2="${800 + i * 84}" y2="450" stroke="rgba(248,250,252,0.18)" stroke-width="2"/>`).join("")}
      ${Array.from({ length: 5 }, (_, i) => `<line x1="800" y1="${150 + i * 75}" x2="1220" y2="${150 + i * 75}" stroke="rgba(248,250,252,0.18)" stroke-width="2"/>`).join("")}
      <path d="M1010 620 Q1010 300 1150 250" stroke="${BRAND.orange}" stroke-width="7" stroke-dasharray="18 16" fill="none"/>
      <circle cx="1010" cy="640" r="40" fill="${BRAND.cream}"/>
      <circle cx="1010" cy="640" r="16" fill="${BRAND.ink}"/>
      <rect x="835" y="300" width="60" height="120" rx="16" fill="${BRAND.cyan}"/>
    `,
  },
  {
    slug: "speed-runner",
    title: "Speed Runner",
    accent: BRAND.orange,
    secondary: BRAND.cyan,
    motif: () => `
      ${Array.from({ length: 5 }, (_, i) => roundRect(700 + i * 40, 620 - i * 26, 210, 14, 7, BRAND.cyan, `opacity="${0.16 + i * 0.13}"`)).join("")}
      ${roundRect(1120, 210, 46, 210, 14, BRAND.violet)}
      ${roundRect(1010, 330, 46, 210, 14, BRAND.violet)}
      <rect x="880" y="380" width="58" height="130" rx="18" fill="${BRAND.orange}"/>
      <circle cx="930" cy="404" r="7" fill="${BRAND.ink}"/>
      ${Array.from({ length: 4 }, (_, i) => `<line x1="${840 - i * 26}" y1="${470 + i * 10}" x2="${870 - i * 26}" y2="${400 + i * 10}" stroke="rgba(255,122,24,0.5)" stroke-width="8" stroke-linecap="round"/>`).join("")}
    `,
  },
  {
    slug: "sudoku-grid",
    title: "Sudoku Grid",
    accent: BRAND.violet,
    secondary: BRAND.cyan,
    motif: () => {
      const size = 470;
      const cell = size / 9;
      const numbers = [
        [0, 0, "5"], [1, 2, "3"], [2, 5, "7"], [3, 1, "9"], [4, 4, "2"],
        [5, 6, "8"], [6, 3, "6"], [7, 7, "4"], [8, 1, "1"], [2, 2, "6"], [6, 7, "9"],
      ];
      const grid = Array.from({ length: 10 }, (_, i) => {
        const weight = i % 3 === 0 ? 6 : 2;
        const color = i % 3 === 0 ? "rgba(248,250,252,0.75)" : "rgba(248,250,252,0.18)";
        return (
          `<line x1="${740 + i * cell}" y1="172" x2="${740 + i * cell}" y2="${172 + size}" stroke="${color}" stroke-width="${weight}"/>` +
          `<line x1="740" y1="${172 + i * cell}" x2="${740 + size}" y2="${172 + i * cell}" stroke="${color}" stroke-width="${weight}"/>`
        );
      }).join("");
      const cells = numbers
        .map(([col, row, value]) =>
          `<text x="${740 + col * cell + cell / 2}" y="${172 + row * cell + cell / 2 + 15}" font-family="sans-serif" font-size="38" font-weight="bold" fill="${value === "2" || value === "9" ? BRAND.cyan : BRAND.cream}" text-anchor="middle">${value}</text>`,
        )
        .join("");
      return grid + cells;
    },
  },
  {
    slug: "tower-guard",
    title: "Tower Guard",
    accent: BRAND.orange,
    secondary: BRAND.violet,
    premium: true,
    motif: () => `
      <path d="M700 690 L1040 690 L1040 520 L820 520 L820 340 L1180 340 L1180 170"
        stroke="rgba(139,92,246,0.55)" stroke-width="56" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${roundRect(900, 420, 74, 74, 16, BRAND.cyan, 'opacity="0.95"')}
      ${roundRect(1060, 240, 74, 74, 16, BRAND.orange, 'opacity="0.95"')}
      ${roundRect(760, 610, 74, 74, 16, BRAND.violet, 'opacity="0.95"')}
      <circle cx="1085" cy="620" r="26" fill="${BRAND.red}"/>
      <circle cx="1160" cy="470" r="26" fill="${BRAND.red}"/>
      <circle cx="900" cy="240" r="26" fill="${BRAND.red}"/>
    `,
  },
  {
    slug: "dungeon-depths",
    title: "Dungeon Depths",
    accent: BRAND.violet,
    secondary: BRAND.orange,
    premium: true,
    motif: () => {
      const rooms = [
        [720, 170, 190, 150], [960, 150, 230, 190], [760, 380, 210, 170],
        [1020, 390, 190, 160], [900, 600, 230, 130], [700, 590, 160, 120],
      ];
      return (
        rooms.map(([x, y, w, h]) => roundRect(x, y, w, h, 22, "rgba(139,92,246,0.20)")).join("") +
        `<path d="M910 245 L960 245 M1060 340 L1060 390 M965 465 L1020 465 M1030 550 L1020 600 M860 550 L860 600" stroke="rgba(139,92,246,0.5)" stroke-width="18"/>` +
        `<circle cx="1075" cy="245" r="20" fill="${BRAND.cyan}"/>` +
        `<circle cx="1105" cy="470" r="20" fill="${BRAND.red}"/>` +
        `<circle cx="865" cy="245" r="26" fill="${BRAND.orange}"/>` +
        `<circle cx="1015" cy="665" r="18" fill="${BRAND.gold}"/>`
      );
    },
  },
  {
    slug: "card-blitz",
    title: "Card Blitz",
    accent: BRAND.red,
    secondary: BRAND.gold,
    premium: true,
    motif: () => {
      const card = (x, y, rotate, suit, color, label) => `
        <g transform="rotate(${rotate} ${x + 90} ${y + 125})">
          ${roundRect(x, y, 180, 250, 20, BRAND.cream)}
          <text x="${x + 26}" y="${y + 62}" font-family="sans-serif" font-size="46" font-weight="bold" fill="${color}">${label}</text>
          <text x="${x + 92}" y="${y + 170}" font-family="sans-serif" font-size="86" fill="${color}" text-anchor="middle">${suit}</text>
        </g>`;
      return (
        card(800, 280, -14, "♠", "#111827", "A") +
        card(910, 240, 0, "♥", "#DC2626", "K") +
        card(1020, 280, 14, "♦", "#DC2626", "Q")
      );
    },
  },
  {
    slug: "skyline-builder",
    title: "Skyline Builder",
    accent: BRAND.cyan,
    secondary: BRAND.gold,
    motif: () => {
      // A stepped tower silhouette with lit windows, standing on a rent graph.
      const tower = (x, baseY, w, h, fill, accentLit) => {
        const windows = [];
        for (let row = 0; row < Math.floor((h - 40) / 62); row += 1) {
          for (let col = 0; col < Math.floor((w - 40) / 58); col += 1) {
            const lit = (row * 7 + col * 3 + x) % 5 !== 0;
            windows.push(
              `<rect x="${x + 22 + col * 58}" y="${baseY - h + 26 + row * 62}" width="30" height="34" rx="5" fill="${lit ? accentLit : "#0d1424"}" opacity="${lit ? 0.92 : 1}"/>`
            );
          }
        }
        return `${roundRect(x, baseY - h, w, h, 14, fill, 'stroke="rgba(139,92,246,0.35)" stroke-width="2"')}${windows.join("")}`;
      };
      const bars = Array.from({ length: 12 }, (_, i) => {
        const h = 26 + ((i * 37) % 70);
        return roundRect(700 + i * 44, 700 - h, 26, h, 8, i % 3 === 0 ? BRAND.gold : "rgba(250,204,21,0.34)");
      }).join("");
      return `
        ${tower(720, 700, 150, 300, "#111a2e", BRAND.gold)}
        ${tower(880, 700, 170, 440, "#0f1729", BRAND.cyan)}
        ${tower(1060, 700, 130, 230, "#111a2e", BRAND.gold)}
        <line x1="690" y1="700" x2="1260" y2="700" stroke="rgba(34,211,238,0.5)" stroke-width="3"/>
        ${bars}
      `;
    },
  },
  {
    slug: "turret-line",
    title: "Turret Line",
    accent: BRAND.orange,
    secondary: BRAND.cyan,
    motif: () => {
      // Reticle over a corridor of incoming shapes.
      const target = (cx, cy, r, color, opacity) => `
        <g opacity="${opacity}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="${color}" opacity="0.5"/>
          <line x1="${cx - r - 12}" y1="${cy}" x2="${cx - r + 6}" y2="${cy}" stroke="${color}" stroke-width="3"/>
          <line x1="${cx + r - 6}" y1="${cy}" x2="${cx + r + 12}" y2="${cy}" stroke="${color}" stroke-width="3"/>
          <line x1="${cx}" y1="${cy - r - 12}" x2="${cx}" y2="${cy - r + 6}" stroke="${color}" stroke-width="3"/>
          <line x1="${cx}" y1="${cy + r - 6}" x2="${cx}" y2="${cy + r + 12}" stroke="${color}" stroke-width="3"/>
        </g>`;
      const tracer = (x1, y1, x2, y2, color, w, opacity) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${opacity}"/>`;
      const enemy = (cx, cy, size, color) => `
        <g>
          <rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="${size * 0.24}"
            transform="rotate(45 ${cx} ${cy})" fill="none" stroke="${color}" stroke-width="3"/>
          <circle cx="${cx}" cy="${cy}" r="${size * 0.24}" fill="${color}" opacity="0.65"/>
        </g>`;
      return `
        ${roundRect(720, 120, 520, 560, 26, "rgba(9,11,20,0.7)", 'stroke="rgba(255,122,24,0.35)" stroke-width="2"')}
        ${tracer(980, 660, 900, 480, BRAND.orange, 9, 0.9)}
        ${tracer(980, 660, 1090, 470, BRAND.orange, 7, 0.55)}
        ${tracer(980, 660, 1010, 400, BRAND.cyan, 5, 0.4)}
        ${enemy(880, 300, 74, BRAND.red)}
        ${enemy(1080, 250, 58, BRAND.gold)}
        ${enemy(1000, 430, 46, BRAND.red)}
        ${target(1080, 250, 58, BRAND.cyan, 0.95)}
        ${roundRect(920, 620, 120, 80, 18, "#141c30", 'stroke="rgba(34,211,238,0.45)" stroke-width="3"')}
        <circle cx="980" cy="660" r="22" fill="${BRAND.orange}"/>
      `;
    },
  },
  {
    slug: "math-rush",
    title: "Math Rush",
    accent: BRAND.gold,
    secondary: BRAND.violet,
    premium: false,
    motif: () => {
      const op = (cx, cy, size, bg, stroke, glyph) => `
        <g>
          ${roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.26, bg, `stroke="${stroke}" stroke-width="3"`)}
          <text x="${cx}" y="${cy + size * 0.19}" font-family="sans-serif" font-size="${size * 0.56}" font-weight="bold"
            fill="${stroke}" text-anchor="middle">${glyph}</text>
        </g>`;
      const digits = Array.from({ length: 16 }, (_, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = 700 + col * 138, y = 150 + row * 138;
        const glyph = ["7", "3", "9", "×", "+", "4", "8", "2", "6", "÷", "5", "1", "−", "0", "=", "?"][i];
        const hot = i % 5 === 1;
        return `
          <g opacity="${hot ? 1 : 0.34}">
            ${roundRect(x, y, 116, 116, 24, hot ? "#1a2238" : "rgba(20,28,48,0.6)",
              `stroke="${hot ? BRAND.gold : "rgba(139,92,246,0.5)"}" stroke-width="${hot ? 3.5 : 2}"`)}
            <text x="${x + 58}" y="${y + 80}" font-family="sans-serif" font-size="62" font-weight="bold"
              fill="${hot ? BRAND.gold : BRAND.cream}" text-anchor="middle">${glyph}</text>
          </g>`;
      }).join("");
      return digits;
    },
  },
  {
    slug: "connect-four-duel",
    title: "Connect Four",
    accent: BRAND.red,
    secondary: BRAND.gold,
    motif: () => {
      const cols = 7, rows = 6, cell = 66, pad = 12;
      const boardW = cols * cell + pad * 2;
      const boardH = rows * cell + pad * 2;
      const bx = 1230 - boardW;
      const by = 640 - boardH;
      // A finished diagonal of four reds, with a few yellows holding the other line.
      const set = new Set(["5,1", "4,2", "3,3", "2,4", "4,4", "5,3", "3,5", "5,4", "4,5", "5,5", "2,6", "1,3"]);
      const reds = new Set(["5,1", "4,2", "3,3", "2,4"]);
      const discs = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) discs.push([r, c]);
      }
      const holes = discs.map(([r, c]) => {
        const key = `${r},${c}`;
        const cx = bx + pad + c * cell + cell / 2;
        const cy = by + pad + r * cell + cell / 2;
        const filled = set.has(key);
        const isRed = reds.has(key);
        return `
          <circle cx="${cx}" cy="${cy}" r="${cell * 0.38}" fill="#0a0f1c"/>
          ${
            filled
              ? `<circle cx="${cx}" cy="${cy}" r="${cell * 0.34}" fill="${isRed ? BRAND.red : BRAND.gold}"
                   opacity="${isRed ? 0.95 : 0.88}" ${isRed ? `stroke="${BRAND.cream}" stroke-width="2.5"` : ""}/>`
              : ""
          }
        `;
      }).join("");
      return `
        ${roundRect(bx, by, boardW, boardH, 26, "#14203a", 'stroke="rgba(34,211,238,0.35)" stroke-width="3"')}
        ${holes}
      `;
    },
  },
];

function frame({ title, accent, secondary, motif, premium, slug }) {
  const gid = `${slug}-grad`;
  const glow = `${slug}-glow`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1020"/>
        <stop offset="55%" stop-color="#090B14"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.28"/>
      </linearGradient>
      <radialGradient id="${glow}" cx="0.78" cy="0.35" r="0.6">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${gid})"/>
    <rect width="${W}" height="${H}" fill="url(#${glow})"/>
    ${Array.from({ length: 18 }, (_, i) => `<line x1="0" y1="${i * 48}" x2="${W}" y2="${i * 48}" stroke="rgba(139,92,246,0.06)" stroke-width="1"/>`).join("")}
    ${Array.from({ length: 28 }, (_, i) => `<line x1="${i * 48}" y1="0" x2="${i * 48}" y2="${H}" stroke="rgba(139,92,246,0.06)" stroke-width="1"/>`).join("")}
    ${motif()}
    <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="rgba(139,92,246,0.28)" stroke-width="3"/>
    <text x="72" y="150" font-family="sans-serif" font-size="26" font-weight="bold" letter-spacing="7" fill="${accent}">PLAYNIX ORIGINAL</text>
    <text x="72" y="640" font-family="sans-serif" font-size="86" font-weight="bold" fill="${BRAND.cream}">${title}</text>
    <line x1="74" y1="686" x2="330" y2="686" stroke="${secondary}" stroke-width="8" stroke-linecap="round"/>
    ${
      premium
        ? `<g>
            <rect x="72" y="716" width="238" height="52" rx="26" fill="${accent}" opacity="0.16" stroke="${accent}" stroke-width="2"/>
            <text x="191" y="751" font-family="sans-serif" font-size="24" font-weight="bold" letter-spacing="3" fill="${accent}" text-anchor="middle">PREMIUM</text>
          </g>`
        : `<g>
            <rect x="72" y="716" width="180" height="52" rx="26" fill="${BRAND.green}" opacity="0.14" stroke="${BRAND.green}" stroke-width="2"/>
            <text x="162" y="751" font-family="sans-serif" font-size="24" font-weight="bold" letter-spacing="3" fill="${BRAND.green}" text-anchor="middle">FREE TO PLAY</text>
          </g>`
    }
  </svg>`;
}

const only = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
let count = 0;
for (const game of games) {
  if (only && game.slug !== only) continue;
  const svg = frame(game);
  const target = path.join(OUT, `${game.slug}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, progressive: true }).toFile(target);
  count += 1;
  console.log(`✓ ${path.relative(process.cwd(), target)}`);
}
console.log(`\n${count} cover(s) written to public/covers/`);
