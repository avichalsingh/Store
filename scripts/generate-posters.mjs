import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function hash(str) {
  let n = 0;
  for (const ch of str) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return n;
}

function svgPoster({
  id,
  title,
  subtitle,
  accent,
  width,
  height,
  kind,
}) {
  const seed = hash(id);
  const x1 = 18 + (seed % 40);
  const y1 = 16 + ((seed >> 3) % 28);
  const x2 = 55 + ((seed >> 6) % 30);
  const y2 = 48 + ((seed >> 9) % 26);
  const r1 = kind === "portrait" ? 38 : 46;
  const r2 = kind === "wide" ? 52 : 28;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a22"/>
      <stop offset="55%" stop-color="#121218"/>
      <stop offset="100%" stop-color="#0c0c0e"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="${x1}%" cy="${y1}%" r="70%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2-${id}" cx="${x2}%" cy="${y2}%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg-${id})"/>
  <rect width="${width}" height="${height}" fill="url(#glow-${id})"/>
  <rect width="${width}" height="${height}" fill="url(#glow2-${id})"/>
  <circle cx="${(width * x1) / 100}" cy="${(height * y1) / 100}" r="${(Math.min(width, height) * r1) / 100}" fill="${accent}" opacity="0.16"/>
  <circle cx="${(width * x2) / 100}" cy="${(height * y2) / 100}" r="${(Math.min(width, height) * r2) / 100}" fill="${accent}" opacity="0.12"/>
  <path d="M ${width * 0.18} ${height * 0.42} C ${width * 0.32} ${height * 0.3}, ${width * 0.48} ${height * 0.56}, ${width * 0.7} ${height * 0.38}" fill="none" stroke="${accent}" stroke-width="${kind === "wide" ? 10 : 14}" stroke-linecap="round" opacity="0.55"/>
  <path d="M ${width * 0.22} ${height * 0.5} C ${width * 0.4} ${height * 0.62}, ${width * 0.58} ${height * 0.36}, ${width * 0.8} ${height * 0.52}" fill="none" stroke="#ffffff" stroke-width="${kind === "wide" ? 4 : 6}" stroke-linecap="round" opacity="0.22"/>
  <rect x="${width * 0.08}" y="${height * 0.12}" width="${width * 0.18}" height="6" rx="3" fill="${accent}" opacity="0.9"/>
</svg>`;
}

const characters = [
  ["milo", "Milo", "Character", "#FF5C8A"],
  ["zara", "Zara", "Character", "#7C6CFF"],
  ["leo", "Leo", "Character", "#3DD6C6"],
  ["nia", "Nia", "Character", "#FFB347"],
  ["kai", "Kai", "Character", "#5B8CFF"],
  ["rio", "Rio", "Character", "#FF6B4A"],
];

const videos = [
  ["pulse-drop", "Pulse Drop", "Milo", "#FF5C8A"],
  ["neon-shuffle", "Neon Shuffle", "Zara", "#7C6CFF"],
  ["side-step-story", "Side Step Story", "Leo", "#3DD6C6"],
  ["spark-parade", "Spark Parade", "Nia", "#FFB347"],
  ["moon-groove", "Moon Groove", "Kai", "#5B8CFF"],
  ["scroll-stopper", "Scroll Stopper", "Rio", "#FF6B4A"],
  ["beat-bounce", "Beat Bounce", "Milo", "#FF5C8A"],
  ["mirror-wave", "Mirror Wave", "Zara", "#7C6CFF"],
  ["switch-lane", "Switch Lane", "Leo", "#3DD6C6"],
  ["sunshine-snap", "Sunshine Snap", "Nia", "#FFB347"],
  ["drift-mode", "Drift Mode", "Kai", "#5B8CFF"],
  ["crowd-tease", "Crowd Tease", "Rio", "#FF6B4A"],
  ["firecracker", "Firecracker", "Milo", "#FF5C8A"],
  ["saffron-swing", "Saffron Swing", "Zara", "#7C6CFF"],
  ["duo-illusion", "Duo Illusion", "Nia", "#FFB347"],
  ["quiet-flex", "Quiet Flex", "Kai", "#5B8CFF"],
  ["mango-pop", "Mango Pop", "Rio", "#FF6B4A"],
  ["turbo-tap", "Turbo Tap", "Milo", "#FF5C8A"],
  ["velvet-turn", "Velvet Turn", "Zara", "#7C6CFF"],
  ["orbit-hop", "Orbit Hop", "Leo", "#3DD6C6"],
  ["confetti-kick", "Confetti Kick", "Nia", "#FFB347"],
  ["low-tide", "Low Tide", "Kai", "#5B8CFF"],
  ["glitch-party", "Glitch Party", "Rio", "#FF6B4A"],
  ["stage-whisper", "Stage Whisper", "Zara", "#7C6CFF"],
];

const collections = [
  ["viral-moves-vol-01", "Viral Moves", "Collection", "#FF5C8A"],
  ["milo-complete-pack", "Milo Pack", "Collection", "#FF5C8A"],
  ["zara-spotlight-pack", "Zara Pack", "Collection", "#7C6CFF"],
  ["cute-and-fun-pack", "Cute & Fun", "Collection", "#3DD6C6"],
  ["chill-groove-pack", "Chill Groove", "Collection", "#5B8CFF"],
  ["nia-personality-pack", "Nia Pack", "Collection", "#FFB347"],
];

const categories = [
  ["trending", "Trending", "Vibe", "#FF5C8A"],
  ["cute-fun", "Cute & Fun", "Vibe", "#3DD6C6"],
  ["hip-hop", "Hip Hop", "Vibe", "#7C6CFF"],
  ["bollywood", "Bollywood", "Vibe", "#FFB347"],
  ["funny", "Funny", "Vibe", "#FF6B4A"],
  ["viral-moves", "Viral Moves", "Vibe", "#FF5C8A"],
  ["chill", "Chill", "Vibe", "#5B8CFF"],
  ["group-dance", "Group Dance", "Vibe", "#7C6CFF"],
];

function write(rel, contents) {
  const dest = join(root, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, contents);
}

for (const [slug, title, subtitle, accent] of videos) {
  write(
    `public/media/videos/${slug}.svg`,
    svgPoster({
      id: slug,
      title,
      subtitle,
      accent,
      width: 720,
      height: 1280,
      kind: "vertical",
    })
  );
}

for (const [slug, title, subtitle, accent] of characters) {
  write(
    `public/media/characters/${slug}.svg`,
    svgPoster({
      id: slug,
      title,
      subtitle,
      accent,
      width: 800,
      height: 1000,
      kind: "portrait",
    })
  );
}

for (const [slug, title, subtitle, accent] of collections) {
  write(
    `public/media/collections/${slug}.svg`,
    svgPoster({
      id: slug,
      title,
      subtitle,
      accent,
      width: 1400,
      height: 900,
      kind: "wide",
    })
  );
}

for (const [slug, title, subtitle, accent] of categories) {
  write(
    `public/media/categories/${slug}.svg`,
    svgPoster({
      id: slug,
      title,
      subtitle,
      accent,
      width: 1200,
      height: 800,
      kind: "wide",
    })
  );
}

console.log("Wrote local poster media");
