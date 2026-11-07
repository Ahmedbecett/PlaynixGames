/**
 * Catalog seed data.
 *
 * Every entry here is a real, working, self-hosted game owned by Playnix
 * (Playnix Originals) and shipped in this repository under public/games/.
 * No placeholder titles, no fake ratings, no invented studios.
 */
import crypto from "node:crypto";

/** Deterministic UUID derived from a string — keeps re-seeding idempotent. */
export function stableId(input: string): string {
  const hex = crypto.createHash("sha1").update(`playnix:${input}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type SeedCategory = {
  slug: string;
  name: string;
  nameAr: string;
  nameFr: string;
  description: string;
  descriptionAr: string;
  descriptionFr: string;
  icon: string;
  sortOrder: number;
};

export const categories: SeedCategory[] = [
  { slug: "action", name: "Action", nameAr: "أكشن", nameFr: "Action", description: "Fast reflexes, constant pressure.", descriptionAr: "سرعة بديهة وضغط مستمر.", descriptionFr: "Réflexes rapides, pression constante.", icon: "⚔️", sortOrder: 1 },
  { slug: "adventure", name: "Adventure", nameAr: "مغامرات", nameFr: "Aventure", description: "Explore worlds and stories.", descriptionAr: "استكشف عوالم وقصصًا.", descriptionFr: "Explorez des mondes et des histoires.", icon: "🧭", sortOrder: 2 },
  { slug: "arcade", name: "Arcade", nameAr: "أركيد", nameFr: "Arcade", description: "Classic arcade thrills, one more run.", descriptionAr: "متعة الأركيد الكلاسيكية، جولة أخرى.", descriptionFr: "Le plaisir de l'arcade, une partie de plus.", icon: "👾", sortOrder: 3 },
  { slug: "racing", name: "Racing", nameAr: "سباقات", nameFr: "Course", description: "Speed, corners and precision.", descriptionAr: "سرعة ومنعطفات ودقة.", descriptionFr: "Vitesse, virages et précision.", icon: "🏎️", sortOrder: 4 },
  { slug: "sports", name: "Sports", nameAr: "رياضة", nameFr: "Sport", description: "Compete on the digital field.", descriptionAr: "نافس على الملعب الرقمي.", descriptionFr: "Affrontez-vous sur le terrain numérique.", icon: "⚽", sortOrder: 5 },
  { slug: "puzzle", name: "Puzzle", nameAr: "ألغاز", nameFr: "Puzzle", description: "Think, plan, solve.", descriptionAr: "فكّر، خطّط، حُلّ.", descriptionFr: "Réfléchissez, planifiez, résolvez.", icon: "🧩", sortOrder: 6 },
  { slug: "strategy", name: "Strategy", nameAr: "استراتيجية", nameFr: "Stratégie", description: "Outthink your opponent.", descriptionAr: "تفوّق على خصمك بالتفكير.", descriptionFr: "Surpassez votre adversaire.", icon: "♟️", sortOrder: 7 },
  { slug: "simulation", name: "Simulation", nameAr: "محاكاة", nameFr: "Simulation", description: "Build, manage, simulate.", descriptionAr: "ابنِ وأدر وحاكِ.", descriptionFr: "Construisez, gérez, simulez.", icon: "🏗️", sortOrder: 8 },
  { slug: "rpg", name: "RPG", nameAr: "تقمص أدوار", nameFr: "RPG", description: "Grow a hero, shape a destiny.", descriptionAr: "طوّر بطلًا واصنع مصيرًا.", descriptionFr: "Faites grandir un héros.", icon: "🐉", sortOrder: 9 },
  { slug: "shooting", name: "Shooting", nameAr: "تصويب", nameFr: "Tir", description: "Aim true and survive.", descriptionAr: "صوّب بدقة وانجُ.", descriptionFr: "Visez juste et survivez.", icon: "🎯", sortOrder: 10 },
  { slug: "multiplayer", name: "Multiplayer", nameAr: "متعددة اللاعبين", nameFr: "Multijoueur", description: "Play with and against others.", descriptionAr: "العب مع الآخرين وضدّهم.", descriptionFr: "Jouez avec et contre les autres.", icon: "👥", sortOrder: 11 },
  { slug: "casual", name: "Casual", nameAr: "عابرة", nameFr: "Occasionnel", description: "Easy to pick up, hard to put down.", descriptionAr: "سهلة التعلّم، صعبة التوقف.", descriptionFr: "Facile à prendre en main.", icon: "🎲", sortOrder: 12 },
  { slug: "educational", name: "Educational", nameAr: "تعليمية", nameFr: "Éducatif", description: "Learn while you play.", descriptionAr: "تعلّم وأنت تلعب.", descriptionFr: "Apprenez en jouant.", icon: "🎓", sortOrder: 13 },
  { slug: "card-games", name: "Card Games", nameAr: "أوراق اللعب", nameFr: "Jeux de cartes", description: "Deal, bluff, win.", descriptionAr: "وزّع وخادع واربح.", descriptionFr: "Distribuez, bluffez, gagnez.", icon: "🃏", sortOrder: 14 },
  { slug: "board-games", name: "Board Games", nameAr: "ألعاب اللوح", nameFr: "Jeux de société", description: "Timeless boards, new opponents.", descriptionAr: "ألواح خالدة وخصوم جدد.", descriptionFr: "Plateaux intemporels.", icon: "🎴", sortOrder: 15 },
  { slug: "classic-games", name: "Classic Games", nameAr: "ألعاب كلاسيكية", nameFr: "Jeux classiques", description: "The originals, rebuilt for mobile.", descriptionAr: "الألعاب الأصلية، أُعيد بناؤها للجوال.", descriptionFr: "Les originaux, repensés pour mobile.", icon: "🕹️", sortOrder: 16 },
];

export type SeedGame = {
  slug: string;
  title: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  developer: string;
  publisher: string;
  pricing: "free" | "premium";
  featured: boolean;
  orientation: "any" | "portrait" | "landscape";
  controls: string;
  languages: string;
  releasedAt: string;
  coverUrl: string;
  screenshots: string[];
  license: string;
  source: string;
};

const ORIGINALS_DEV = "Playnix Originals";
const ORIGINALS_LICENSE = "© Playnix Originals — self-hosted, all rights reserved";
const ORIGINALS_SOURCE = "In-house build (public/games), shipped with the app";

export const games: SeedGame[] = [
  {
    slug: "neon-serpent",
    title: "Neon Serpent",
    categorySlug: "arcade",
    shortDescription: "Grow a glowing serpent, dodge your own tail, chase the high score.",
    description:
      "A neon reimagining of the arcade classic. Steer a luminous serpent through a grid of pulsing energy orbs, growing longer with every bite. Three speeds, swipe or keyboard control, and a particle engine that reacts to every turn. Runs entirely in the Mini App — no downloads, no installs.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: true,
    orientation: "any",
    controls: "Arrow keys / WASD / swipe / on-screen D-pad",
    languages: "en,ar,fr",
    releasedAt: "2026-09-18",
    coverUrl: "/covers/neon-serpent.jpg",
    screenshots: ["/covers/neon-serpent.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "void-breaker",
    title: "Void Breaker",
    categorySlug: "arcade",
    shortDescription: "Break every brick in a collapsing neon grid before the void closes in.",
    description:
      "A brick-breaker built for touch screens: drag the paddle, angle your shots, and clear wave after wave of crystalline blocks. Power-ups change the physics on every wave, and the soundtrack layer builds as your combo chain grows.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "portrait",
    controls: "Drag / mouse / arrow keys",
    languages: "en,ar,fr",
    releasedAt: "2026-09-26",
    coverUrl: "/covers/void-breaker.jpg",
    screenshots: ["/covers/void-breaker.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "astro-dodge",
    title: "Astro Dodge",
    categorySlug: "action",
    shortDescription: "Thread a tiny ship through an asteroid storm and blast what you can't dodge.",
    description:
      "Endless survival in deep space. Thrust, drift and shoot through escalating asteroid fields, collecting shield fragments between waves. Difficulty ramps smoothly, so a good run always feels earned and a great run feels impossible.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: true,
    orientation: "any",
    controls: "Arrow keys / WASD to fly, Space or tap to fire",
    languages: "en,ar,fr",
    releasedAt: "2026-10-04",
    coverUrl: "/covers/astro-dodge.jpg",
    screenshots: ["/covers/astro-dodge.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "block-cascade",
    title: "Block Cascade",
    categorySlug: "puzzle",
    shortDescription: "Stack falling blocks, clear lines and keep the cascade alive.",
    description:
      "A modern falling-block puzzle with ghost pieces, hold, soft-drop and a cascade bonus for consecutive clears. Designed for phones first: large touch targets, adjustable speed, and a pause that actually pauses.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "portrait",
    controls: "Swipe to move, tap to rotate, swipe down to drop",
    languages: "en,ar,fr",
    releasedAt: "2026-10-12",
    coverUrl: "/covers/block-cascade.jpg",
    screenshots: ["/covers/block-cascade.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "memory-matrix",
    title: "Memory Matrix",
    categorySlug: "casual",
    shortDescription: "Flip, match and remember — a memory game with a neon grid and a timer.",
    description:
      "Match pairs on a glowing matrix across three board sizes. Every round tracks your moves and time, rewarding memory over luck. A calm, readable interface that works as well on a tablet as it does on a small phone.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "portrait",
    controls: "Tap cards",
    languages: "en,ar,fr",
    releasedAt: "2026-10-20",
    coverUrl: "/covers/memory-matrix.jpg",
    screenshots: ["/covers/memory-matrix.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "reversi-duel",
    title: "Reversi Duel",
    categorySlug: "board-games",
    shortDescription: "The classic disc-flipping duel, with three difficulty levels and a fair AI.",
    description:
      "Reversi (Othello) rebuilt for Telegram: place, flank and flip. Three AI levels use minimax with positional weighting — beginner, club and expert. Includes legal-move hints, score tracking and a full undo of your last move.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "premium",
    featured: true,
    orientation: "any",
    controls: "Tap a highlighted square",
    languages: "en,ar,fr",
    releasedAt: "2026-10-28",
    coverUrl: "/covers/reversi-duel.jpg",
    screenshots: ["/covers/reversi-duel.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "tetra-stack",
    title: "Tetra Stack",
    categorySlug: "puzzle",
    shortDescription: "Falling blocks, tight gaps and a stack that punishes every hesitation.",
    description:
      "The falling-block classic, rebuilt for touch with a ghost preview, a seven-piece bag that never starves you of the piece you need, and four speed levels that ramp with every ten lines. Soft drop, hard drop, rotate with wall kicks — all reachable from one thumb.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: true,
    orientation: "portrait",
    controls: "On-screen pad / arrow keys / swipe to move, tap to rotate, swipe down to drop",
    languages: "en,ar,fr",
    releasedAt: "2026-10-09",
    coverUrl: "/covers/tetra-stack.jpg",
    screenshots: ["/covers/tetra-stack.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "tile-merge",
    title: "Tile Merge",
    categorySlug: "puzzle",
    shortDescription: "Slide, merge and chase 2048 on a board that fills up fast.",
    description:
      "A slick 2048 with swipe and keyboard input, one-step undo, and a target that never stops climbing. Every merge is scored, every move spawns a new tile, and the game ends exactly when you run out of space — no timers, no ads, just planning.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "portrait",
    controls: "Swipe / arrow keys / WASD",
    languages: "en,ar,fr",
    releasedAt: "2026-10-11",
    coverUrl: "/covers/tile-merge.jpg",
    screenshots: ["/covers/tile-merge.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "flap-quest",
    title: "Flap Quest",
    categorySlug: "casual",
    shortDescription: "One tap, one bird, endless gates that get tighter every point.",
    description:
      "A one-thumb flight through narrow gates: gravity pulls, taps lift, and the gap shrinks as your score climbs. Tuned for phones — short runs, fast restarts, and a personal best that always feels one tap away.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "portrait",
    controls: "Tap / Space to flap",
    languages: "en,ar,fr",
    releasedAt: "2026-10-13",
    coverUrl: "/covers/flap-quest.jpg",
    screenshots: ["/covers/flap-quest.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "maze-escape",
    title: "Maze Escape",
    categorySlug: "adventure",
    shortDescription: "Collect three keys and find the door before the clock eats your score.",
    description:
      "Every level is a freshly generated maze with loops, dead ends and three hidden keys. The door stays locked until you hold all three, and the next floor is always bigger. Swipe, tap or use the arrow keys — the maze is drawn to fit any screen.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "any",
    controls: "Swipe / arrow keys / on-screen d-pad",
    languages: "en,ar,fr",
    releasedAt: "2026-10-15",
    coverUrl: "/covers/maze-escape.jpg",
    screenshots: ["/covers/maze-escape.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "penalty-shot",
    title: "Penalty Shot",
    categorySlug: "sports",
    shortDescription: "Ten kicks, a diving keeper and a crosshair you place yourself.",
    description:
      "Drag to place your shot anywhere inside the frame, release, and watch the keeper commit. Ten kicks per match, goals and streaks both score, and the keeper reads your aim better with every attempt.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "any",
    controls: "Drag to aim, release to shoot",
    languages: "en,ar,fr",
    releasedAt: "2026-10-18",
    coverUrl: "/covers/penalty-shot.jpg",
    screenshots: ["/covers/penalty-shot.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "speed-runner",
    title: "Speed Runner",
    categorySlug: "racing",
    shortDescription: "Endless sprint: jump the low blocks, slide under the high ones.",
    description:
      "A side-scrolling runner with two verbs — jump and slide — and a speed curve that keeps climbing. Coins extend your score, obstacles come in pairs, and the run ends the moment your timing slips.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "landscape",
    controls: "Tap to jump, hold the slide button (or ArrowDown) to duck",
    languages: "en,ar,fr",
    releasedAt: "2026-10-20",
    coverUrl: "/covers/speed-runner.jpg",
    screenshots: ["/covers/speed-runner.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "sudoku-grid",
    title: "Sudoku Grid",
    categorySlug: "classic-games",
    shortDescription: "Real Sudoku with a guaranteed single solution and four levels.",
    description:
      "Every puzzle is generated on the device and verified to have exactly one solution — no copied grids, no guessing. Four difficulties, peer highlighting, five permitted mistakes and three hints per puzzle, with your best time stored per level.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "free",
    featured: false,
    orientation: "any",
    controls: "Tap a cell, then a number. Keyboard 1-9 works too",
    languages: "en,ar,fr",
    releasedAt: "2026-10-22",
    coverUrl: "/covers/sudoku-grid.jpg",
    screenshots: ["/covers/sudoku-grid.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "tower-guard",
    title: "Tower Guard",
    categorySlug: "strategy",
    shortDescription: "Ten waves, three tower types and one gate you cannot lose.",
    description:
      "A full tower-defence run built for phones: archers, cannons and frost towers, three upgrade levels each, and ten escalating waves with a boss-sized final push. Gold is tight, placement matters, and losing a single leak costs a life. Premium members get the whole campaign unlocked.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "premium",
    featured: true,
    orientation: "any",
    controls: "Tap a green tile to build or upgrade",
    languages: "en,ar,fr",
    releasedAt: "2026-11-01",
    coverUrl: "/covers/tower-guard.jpg",
    screenshots: ["/covers/tower-guard.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "dungeon-depths",
    title: "Dungeon Depths",
    categorySlug: "rpg",
    shortDescription: "Turn-based dungeon crawling: one move, one monster response.",
    description:
      "A classic grid roguelike: every step you take is a turn the monsters also take. Walk into an enemy to attack, grab potions before they corner you, and find the stairs down. Each depth adds monsters, gold and a little more dread. Premium members descend as far as they dare.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "premium",
    featured: false,
    orientation: "any",
    controls: "Arrow keys / WASD / on-screen d-pad / swipe",
    languages: "en,ar,fr",
    releasedAt: "2026-11-03",
    coverUrl: "/covers/dungeon-depths.jpg",
    screenshots: ["/covers/dungeon-depths.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
  {
    slug: "card-blitz",
    title: "Card Blitz",
    categorySlug: "card-games",
    shortDescription: "Six-deck blackjack with real betting, splits of strategy and 3:2 naturals.",
    description:
      "Blackjack with a proper shoe: six decks, reshuffled when they run low, dealer stands on 17, blackjack pays 3:2 and doubling is allowed on any first two cards. Your bankroll is saved between sessions, so a good run actually means something. Premium members play with an unlimited table.",
    developer: ORIGINALS_DEV,
    publisher: "Playnix",
    pricing: "premium",
    featured: false,
    orientation: "any",
    controls: "Tap the bet chips, then Hit / Stand / Double",
    languages: "en,ar,fr",
    releasedAt: "2026-11-05",
    coverUrl: "/covers/card-blitz.jpg",
    screenshots: ["/covers/card-blitz.jpg"],
    license: ORIGINALS_LICENSE,
    source: ORIGINALS_SOURCE,
  },
];

export type SeedPlan = {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  description: string;
  price: number;
  durationDays: number;
  features: string[];
  sortOrder: number;
};

export const plans: SeedPlan[] = [
  {
    id: stableId("plan-monthly"),
    name: "Premium · 1 month",
    nameAr: "بريميوم · شهر",
    nameFr: "Premium · 1 mois",
    description: "Full Premium collection for 30 days.",
    price: 250,
    durationDays: 30,
    features: ["premium.benefit.library", "premium.benefit.collections", "premium.benefit.ads"],
    sortOrder: 1,
  },
  {
    id: stableId("plan-quarterly"),
    name: "Premium · 3 months",
    nameAr: "بريميوم · 3 أشهر",
    nameFr: "Premium · 3 mois",
    description: "Three months of Premium, saving 13%.",
    price: 650,
    durationDays: 90,
    features: ["premium.benefit.library", "premium.benefit.collections", "premium.benefit.ads", "premium.benefit.early"],
    sortOrder: 2,
  },
  {
    id: stableId("plan-yearly"),
    name: "Premium · 1 year",
    nameAr: "بريميوم · سنة",
    nameFr: "Premium · 1 an",
    description: "Best value: a full year of Premium.",
    price: 2000,
    durationDays: 365,
    features: ["premium.benefit.library", "premium.benefit.collections", "premium.benefit.ads", "premium.benefit.early", "premium.benefit.support"],
    sortOrder: 3,
  },
];

export const adPlacements = [
  { key: "home_banner", label: "Homepage banner", enabled: 0 },
  { key: "game_details", label: "Game details banner", enabled: 0 },
  { key: "home_promo", label: "Homepage promotional section", enabled: 0 },
  { key: "search_sponsored", label: "Sponsored search listing", enabled: 0 },
];

export const settings = [
  { key: "premium_enabled", value: "true" },
  { key: "ads_enabled", value: "false" },
  { key: "maintenance_mode", value: "false" },
  { key: "support_url", value: "" },
  { key: "terms_url", value: "" },
  { key: "privacy_url", value: "" },
];
