/**
 * Explicitly authored CAPTION_PACK seed products.
 * Each item is a paired caption + hashtags[] — never derived from legacy packs.
 */

import { normalizeAdminProduct } from "@/admin/lib/normalizeProduct";
import type { AdminProduct } from "@/admin/types";
import type { CaptionPackItem } from "@/catalog/productPayloads";

const now = "2026-08-26T12:00:00.000Z";

const M = {
  pulse: "/media/videos/pulse-drop.jpg",
  funny: "/media/categories/funny.jpg",
  velvet: "/media/videos/velvet-turn.jpg",
  neon: "/media/videos/neon-shuffle.jpg",
  viral: "/media/categories/viral-moves.jpg",
} as const;

function product(
  partial: Omit<AdminProduct, "productType" | "relationships"> &
    Partial<Pick<AdminProduct, "productType" | "relationships">> & { id: string },
): AdminProduct {
  return normalizeAdminProduct(partial);
}

function meta(opts: {
  badge: string;
  sales: number;
  revenueInr: number;
  trending?: boolean;
  featured?: boolean;
}) {
  return {
    status: "active" as const,
    isTrending: Boolean(opts.trending),
    isFeatured: Boolean(opts.featured),
    offer: { enabled: false, label: "" },
    performance: {
      mode: "demo" as const,
      plays: "0",
      playsNumeric: 0,
      likes: "0",
      likesNumeric: 0,
      shares: "0",
      sharesNumeric: 0,
      engagementPct: 0,
      status: "normal" as const,
      badge: opts.badge,
      insight: "",
    },
    creatorActivity: {
      mode: "demo" as const,
      addedThisWeek: 12 + (opts.sales % 40),
      saved: 40 + opts.sales,
      last24h: 2 + (opts.sales % 8),
      activityLevel: "normal" as const,
      note: "Demo content pack.",
    },
    campaign: {
      enabled: false,
      label: "",
      headline: "",
      supportingText: "",
      ctaText: "",
      microMessages: [] as string[],
    },
    availability: { mode: "unlimited" as const },
    duration: "",
    resolution: "",
    format: "",
    licenses: [],
    sales: opts.sales,
    revenueInr: opts.revenueInr,
    collectionIds: [] as string[],
    updatedAt: now,
  };
}

function money(inrReg: number, inrCur: number, usdReg: number, usdCur: number) {
  return {
    INR: { regularPrice: inrReg, currentPrice: inrCur },
    USD: { regularPrice: usdReg, currentPrice: usdCur },
  };
}

function items(
  rows: Array<{
    caption: string;
    hashtags: string[];
    label?: string;
  }>,
): CaptionPackItem[] {
  return rows.map((row, i) => ({
    id: `item-${i + 1}`,
    caption: row.caption,
    hashtags: row.hashtags,
    label: row.label,
  }));
}

export const marketplaceContentPackProducts: AdminProduct[] = [
  product({
    id: "prod-content-001",
    name: "Viral Reels Content Pack",
    slug: "viral-reels-content-pack",
    productType: "CAPTION_PACK",
    category: "Viral",
    shortDescription:
      "4 paired caption + hashtag combos built for dance & lifestyle reels.",
    description:
      "Each item is a scroll-stopping caption with a matching hashtag set — copy, paste, and post. Preview shows 3 items; full pack unlocks after purchase.",
    tags: ["captions", "hashtags", "reels", "viral"],
    media: { thumbnail: M.pulse },
    pricing: money(399, 299, 4.99, 3.99),
    ...meta({
      badge: "Caption Pack",
      sales: 401,
      revenueInr: 119699,
      trending: true,
      featured: true,
    }),
    access: "Instant unlock",
    captionPackData: {
      items: items([
        {
          caption: "Wait for it… 👀",
          label: "Hook",
          hashtags: [
            "#reels",
            "#fyp",
            "#viralreels",
            "#waitforit",
            "#trending",
          ],
        },
        {
          caption: "Don't scroll yet.",
          label: "Hook",
          hashtags: [
            "#dancereels",
            "#fypdance",
            "#viralmoves",
            "#reelsindia",
            "#pulsecheck",
          ],
        },
        {
          caption: "POV: the algorithm found you.",
          label: "POV",
          hashtags: [
            "#contentcreator",
            "#reelsgrowth",
            "#creatorlife",
            "#shortform",
            "#socialmedia",
          ],
        },
        {
          caption: "Save this before it trends.",
          label: "CTA",
          hashtags: [
            "#reelsinstagram",
            "#indiancreators",
            "#desicontent",
            "#mumbai",
            "#delhi",
          ],
        },
      ]),
    },
    createdAt: "2026-08-08T08:00:00.000Z",
  }),
  product({
    id: "prod-content-002",
    name: "Funny Character Content Pack",
    slug: "funny-character-content-pack",
    productType: "CAPTION_PACK",
    category: "Comedy",
    shortDescription:
      "4 relatable comedy caption + hashtag pairs for chaotic creators.",
    description:
      "Group-chat energy captions with discovery tags tuned for funny reels and meme posts.",
    tags: ["captions", "hashtags", "funny", "relatable"],
    media: { thumbnail: M.funny },
    pricing: money(349, 269, 4.49, 3.29),
    ...meta({
      badge: "Caption Pack",
      sales: 298,
      revenueInr: 80162,
      trending: true,
      featured: false,
    }),
    access: "Instant unlock",
    captionPackData: {
      items: items([
        {
          caption: "My confidence vs my Wi-Fi.",
          label: "Funny",
          hashtags: [
            "#funnyreels",
            "#comedy",
            "#relatable",
            "#memesdaily",
            "#lol",
          ],
        },
        {
          caption: "Main character until I open my camera roll.",
          label: "Funny",
          hashtags: [
            "#meme",
            "#dankmemes",
            "#chaoticgood",
            "#unhinged",
            "#funnyvideos",
          ],
        },
        {
          caption: "Professionally unserious.",
          label: "Short",
          hashtags: [
            "#creatorhumor",
            "#skit",
            "#comedycontent",
            "#viralcomedy",
            "#funnyvideos",
          ],
        },
        {
          caption: "Sorry for what my feet are about to do.",
          label: "Funny",
          hashtags: [
            "#funnyreels",
            "#dancecomedy",
            "#relatable",
            "#fyp",
            "#viral",
          ],
        },
      ]),
    },
    createdAt: "2026-08-13T08:00:00.000Z",
  }),
  product({
    id: "prod-content-003",
    name: "POV Relationship Content Pack",
    slug: "pov-relationship-content-pack",
    productType: "CAPTION_PACK",
    category: "Relationship",
    shortDescription:
      "4 POV & relationship caption + hashtag pairs for soft-launch energy.",
    description:
      "Couple content, situationships, and share triggers — each caption ships with its own hashtag set.",
    tags: ["captions", "hashtags", "pov", "relationship"],
    media: { thumbnail: M.velvet },
    pricing: money(399, 319, 4.99, 3.99),
    ...meta({
      badge: "Caption Pack",
      sales: 221,
      revenueInr: 70599,
      trending: false,
      featured: true,
    }),
    access: "Instant unlock",
    captionPackData: {
      items: items([
        {
          caption: "POV: soft launch energy.",
          label: "POV",
          hashtags: [
            "#softlaunch",
            "#couplegoals",
            "#relationshipreels",
            "#love",
            "#us",
          ],
        },
        {
          caption: "POV: the situationship got loud.",
          label: "POV",
          hashtags: [
            "#pov",
            "#situationship",
            "#datinglife",
            "#relationship",
            "#feelings",
          ],
        },
        {
          caption: "Sending this to someone specific.",
          label: "Share",
          hashtags: [
            "#tagthem",
            "#sendthis",
            "#foryou",
            "#relatablelove",
            "#couples",
          ],
        },
        {
          caption: "Soft launch. Hard feelings.",
          label: "Short",
          hashtags: [
            "#softlaunch",
            "#pov",
            "#relationship",
            "#reels",
            "#viral",
          ],
        },
      ]),
    },
    createdAt: "2026-08-11T08:00:00.000Z",
  }),
  product({
    id: "prod-content-004",
    name: "AI Art Social Content Pack",
    slug: "ai-art-social-content-pack",
    productType: "CAPTION_PACK",
    category: "AI Art",
    shortDescription:
      "3 caption + hashtag pairs for AI artwork and prompt-share posts.",
    description:
      "Discovery-ready combos for Midjourney, Flux, and AI art communities.",
    tags: ["captions", "hashtags", "ai", "art"],
    media: { thumbnail: M.neon },
    pricing: money(299, 229, 3.99, 2.79),
    ...meta({
      badge: "Caption Pack",
      sales: 156,
      revenueInr: 35724,
      trending: false,
      featured: false,
    }),
    access: "Instant unlock",
    captionPackData: {
      items: items([
        {
          caption: "Made this in one prompt.",
          label: "AI Art",
          hashtags: [
            "#aiart",
            "#aigenerated",
            "#midjourney",
            "#aiartists",
            "#generativeart",
          ],
        },
        {
          caption: "Prompt in comments if you want it.",
          label: "Prompt share",
          hashtags: [
            "#promptshare",
            "#aiprompt",
            "#stablediffusion",
            "#fluxai",
            "#aiartwork",
          ],
        },
        {
          caption: "Still can't believe this is AI.",
          label: "Discovery",
          hashtags: [
            "#digitalart",
            "#conceptart",
            "#fantasyart",
            "#characterdesign",
            "#artcommunity",
          ],
        },
      ]),
    },
    createdAt: "2026-08-09T08:00:00.000Z",
  }),
  product({
    id: "prod-content-005",
    name: "Trending Creator Content Pack",
    slug: "trending-creator-content-pack",
    productType: "CAPTION_PACK",
    category: "Creator",
    shortDescription:
      "4 creator-growth caption + hashtag pairs for consistent posting.",
    description:
      "Balanced reach, niche, and community tags — each paired with a ready caption.",
    tags: ["captions", "hashtags", "creator", "growth"],
    media: { thumbnail: M.viral },
    pricing: money(379, 299, 4.79, 3.79),
    ...meta({
      badge: "Caption Pack",
      sales: 173,
      revenueInr: 51727,
      trending: false,
      featured: true,
    }),
    access: "Instant unlock",
    captionPackData: {
      items: items([
        {
          caption: "Posting through the plateau.",
          label: "Growth",
          hashtags: [
            "#fyp",
            "#viral",
            "#explore",
            "#reelsinstagram",
            "#foryoupage",
          ],
        },
        {
          caption: "Small creator, loud ideas.",
          label: "Community",
          hashtags: [
            "#contentcreator",
            "#creatorjourney",
            "#reelstips",
            "#growthhacks",
            "#createeveryday",
          ],
        },
        {
          caption: "Engagement is a habit.",
          label: "Engagement",
          hashtags: [
            "#creatorsupport",
            "#smallcreator",
            "#engagement",
            "#collab",
            "#creativecommunity",
          ],
        },
        {
          caption: "Made for the India feed.",
          label: "Reach",
          hashtags: [
            "#indianreels",
            "#desicreator",
            "#reelsindia",
            "#instagood",
            "#dailyreels",
          ],
        },
      ]),
    },
    createdAt: "2026-08-13T08:00:00.000Z",
  }),
];
