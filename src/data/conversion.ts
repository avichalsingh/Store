import type {
  Collection,
  CreatorActivity,
  CreatorInsight,
  CreatorTestimonial,
  LaunchOffer,
  ProductPerformance,
  ProductPricing,
  SocialProofRotation,
  TrendingStripItem,
  VideoProduct,
} from "@/types";

export const DEFAULT_PERFORMANCE_DISCLAIMER =
  "Demo benchmark based on sample campaign data. Replace with verified performance data when available.";

const LAUNCH_END = "2026-09-20T23:59:59+05:30";
const BUNDLE_END = "2026-09-25T23:59:59+05:30";

export function inferVideoPricing(usdSale: number): ProductPricing {
  return {
    india: { regularPrice: 399, salePrice: 399 },
    international: { regularPrice: usdSale, salePrice: usdSale },
  };
}

export function inferCollectionPricing(
  usdSale: number,
  usdRegular: number
): ProductPricing {
  return {
    india: { regularPrice: 1499, salePrice: 799 },
    international: { regularPrice: usdRegular, salePrice: usdSale },
  };
}

type VideoConversion = {
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  performance?: ProductPerformance;
  activity?: CreatorActivity;
  socialRotation?: SocialProofRotation;
  creatorInsights?: CreatorInsight[];
  creatorRating?: number;
  showCardMetrics?: boolean;
};

type CollectionConversion = {
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  performance?: ProductPerformance;
  activity?: CreatorActivity;
  socialProofText?: string;
  valueStack?: string[];
  exclusiveCount?: number;
  unreleasedCount?: number;
};

export const videoConversion: Record<string, VideoConversion> = {
  "vid-001": {
    pricing: {
      india: { regularPrice: 899, salePrice: 799 },
      international: { regularPrice: 12.99, salePrice: 9.99 },
    },
    offer: {
      enabled: true,
      label: "LAUNCH PRICE ACTIVE",
      discountText: "11% OFF",
      endDate: LAUNCH_END,
    },
    showCardMetrics: true,
    creatorRating: 4.9,
    performance: {
      mode: "demo",
      type: "trending",
      primaryMetric: "3.3M",
      primaryNumeric: 3_300_000,
      primaryLabel: "PLAYS",
      secondaryMetrics: [
        { label: "LIKES", value: "218K", numeric: 218_000 },
        { label: "SHARES", value: "42K", numeric: 42_000 },
      ],
      insight: "Strong hook retention in the first 3 seconds.",
      badge: "TRENDING NOW",
      aboveAverage: "↑ 24% this week",
      supportingText: "This format is gaining momentum right now.",
      momentumLabel: "MOMENTUM IS CLIMBING ↑",
      engagementText: "218K likes · 42K shares",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 128,
      saved: 940,
      last24h: 34,
      activityLevel: "high",
      note: "Creators are jumping on this right now.",
    },
    socialRotation: {
      mode: "demo",
      messages: [
        "3.3M plays and climbing",
        "42K shares on this format",
        "Creators are actively exploring this format",
      ],
    },
    creatorInsights: [
      {
        icon: "hook",
        title: "Instant visual hook",
        description:
          "The movement creates a pattern break before viewers can scroll away.",
      },
      {
        icon: "replay",
        title: "Made for the replay",
        description:
          "The delayed drop creates a “wait… what?” moment that encourages another watch.",
      },
      {
        icon: "spark",
        title: "Easy to make your own",
        description:
          "Use your own character, style or personality without rebuilding the whole concept.",
      },
    ],
  },
  "vid-002": {
    pricing: {
      india: { regularPrice: 899, salePrice: 449 },
      international: { regularPrice: 34.99, salePrice: 14.99 },
    },
    offer: {
      enabled: true,
      label: "INTRODUCTORY OFFER",
      discountText: "SAVE 50%",
    },
    showCardMetrics: true,
    creatorRating: 4.8,
    performance: {
      mode: "demo",
      type: "engagement-spike",
      primaryMetric: "847K",
      primaryNumeric: 847_000,
      primaryLabel: "PLAYS",
      secondaryMetrics: [
        { label: "LIKES", value: "76K", numeric: 76_000 },
        { label: "SHARES", value: "9.2K", numeric: 9_200 },
      ],
      insight: "One of the fastest-moving formats right now.",
      badge: "🚀 ENGAGEMENT SPIKE",
      aboveAverage: "↑ +186% ABOVE AVERAGE",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 84,
      saved: 61,
      last24h: 12,
      activityLevel: "rising",
      note: "Creators are picking this up for new posts.",
    },
    socialRotation: {
      mode: "demo",
      messages: [
        "🚀 +186% above average engagement",
        "⭐ Saved by 61 creators",
        "👀 Fast-moving format this week",
      ],
    },
    creatorInsights: [
      {
        icon: "eye",
        title: "Designed to stand out",
        description:
          "Clean isolations and bold framing are built for attention in busy feeds.",
      },
      {
        icon: "chat",
        title: "Reaction potential",
        description:
          "The format naturally invites comments and “where did you get this?” questions.",
      },
    ],
  },
  "vid-004": {
    pricing: {
      india: { regularPrice: 799, salePrice: 399 },
      international: { regularPrice: 29.99, salePrice: 13.99 },
    },
    showCardMetrics: true,
    creatorRating: 4.7,
    performance: {
      mode: "demo",
      type: "share-magnet",
      primaryMetric: "14.1K",
      primaryNumeric: 14_100,
      primaryLabel: "SHARES",
      secondaryMetrics: [
        { label: "PLAYS", value: "1.2M", numeric: 1_200_000 },
        { label: "LIKES", value: "98K", numeric: 98_000 },
      ],
      insight: "People didn't just watch it. They sent it.",
      badge: "↗ SHARE MAGNET",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 96,
      saved: 54,
      last24h: 11,
      activityLevel: "high",
      note: "Share velocity is unusually strong for this drop.",
    },
    socialRotation: {
      mode: "demo",
      messages: [
        "↗ 14.1K shares on this format",
        "💬 Comments keep asking where it came from",
        "🔥 One of today's most sent formats",
      ],
    },
    creatorInsights: [
      {
        icon: "share",
        title: "Built for attention",
        description:
          "Playful energy that feels different from standard dance templates.",
      },
      {
        icon: "chat",
        title: "Comment Magnet",
        description:
          "Big personality and unexpected timing invite reactions in the comments.",
      },
    ],
  },
  "vid-006": {
    pricing: {
      india: { regularPrice: 999, salePrice: 449 },
      international: { regularPrice: 32.99, salePrice: 12.49 },
    },
    offer: {
      enabled: true,
      label: "RELEASE SPECIAL",
      discountText: "SAVE 55%",
      endDate: "2026-09-12T23:59:59+05:30",
    },
    showCardMetrics: true,
    creatorRating: 4.9,
    performance: {
      mode: "demo",
      type: "scroll-stopper",
      primaryMetric: "73%",
      primaryNumeric: 73,
      primaryLabel: "WATCH-THROUGH",
      secondaryMetrics: [
        { label: "PLAYS", value: "2.4M", numeric: 2_400_000 },
        { label: "SHARES", value: "31.2K", numeric: 31_200 },
      ],
      insight: "Most viewers stayed to see the move.",
      badge: "👀 SCROLL STOPPER",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 141,
      saved: 92,
      last24h: 23,
      activityLevel: "high",
      note: "Hold-rate is the story on this one.",
    },
    socialRotation: {
      mode: "demo",
      messages: [
        "👀 73% watch-through on sample campaigns",
        "🔥 2.4M sample plays",
        "⚡ Release pricing currently active",
      ],
    },
  },
  "vid-013": {
    showCardMetrics: true,
    creatorRating: 4.8,
    performance: {
      mode: "demo",
      type: "share-magnet",
      primaryMetric: "22.5K",
      primaryNumeric: 22_500,
      primaryLabel: "SHARES",
      secondaryMetrics: [
        { label: "PLAYS", value: "960K", numeric: 960_000 },
        { label: "LIKES", value: "81K", numeric: 81_000 },
      ],
      insight: "People didn't just watch it. They sent it.",
      badge: "↗ SHARE MAGNET",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 73,
      saved: 48,
      last24h: 9,
      activityLevel: "rising",
      note: "Clip-and-send energy is doing the work.",
    },
  },
  "vid-023": {
    showCardMetrics: true,
    creatorRating: 4.6,
    performance: {
      mode: "demo",
      type: "comment-magnet",
      primaryMetric: "9.4K",
      primaryNumeric: 9_400,
      primaryLabel: "COMMENTS",
      secondaryMetrics: [
        { label: "PLAYS", value: "1.1M", numeric: 1_100_000 },
        { label: "SHARES", value: "16.7K", numeric: 16_700 },
      ],
      insight: "The reactions are doing half the promotion.",
      badge: "💬 COMMENT MAGNET",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 58,
      saved: 41,
      last24h: 8,
      activityLevel: "rising",
      note: "Comment threads are carrying this format.",
    },
  },
  "vid-015": {
    showCardMetrics: true,
    creatorRating: 4.7,
    performance: {
      mode: "demo",
      type: "replay-friendly",
      primaryMetric: "3.2×",
      primaryNumeric: 3.2,
      primaryLabel: "AVG REWATCH",
      secondaryMetrics: [
        { label: "PLAYS", value: "640K", numeric: 640_000 },
        { label: "SHARES", value: "11.3K", numeric: 11_300 },
      ],
      insight: "The ending makes people want to see it again.",
      badge: "🔁 REPLAY FRIENDLY",
    },
    activity: {
      mode: "demo",
      addedThisWeek: 66,
      saved: 39,
      last24h: 7,
      activityLevel: "steady",
      note: "Rewatch loops are the hook.",
    },
  },
  "vid-008": {
    creatorRating: 4.9,
    performance: {
      mode: "demo",
      type: "engagement-spike",
      primaryMetric: "720K",
      primaryNumeric: 720_000,
      primaryLabel: "PLAYS",
      secondaryMetrics: [
        { label: "LIKES", value: "64K", numeric: 64_000 },
        { label: "SHARES", value: "8.1K", numeric: 8_100 },
      ],
      insight: "Editorial energy that still stops the scroll.",
      badge: "⭐ CREATOR FAVORITE",
      aboveAverage: "↑ +94% ABOVE AVERAGE",
    },
  },
};

export const collectionConversion: Record<string, CollectionConversion> = {
  "col-viral-01": {
    pricing: {
      india: { regularPrice: 2388, salePrice: 799 },
      international: { regularPrice: 79.94, salePrice: 49.99 },
    },
    offer: {
      enabled: true,
      label: "LIMITED RELEASE OFFER",
      discountText: "SAVE 67%",
      endDate: BUNDLE_END,
    },
    performance: {
      mode: "demo",
      type: "trending",
      primaryMetric: "6.1M",
      primaryNumeric: 6_100_000,
      primaryLabel: "SAMPLE PLAYS",
      secondaryMetrics: [
        { label: "LIKES", value: "512K" },
        { label: "SHARES", value: "88K" },
      ],
      insight: "A pack of formats people keep looping.",
      badge: "🔥 TRENDING COLLECTION",
    },
    socialProofText: "One of today's most explored collections",
    valueStack: [
      "6 ready-to-use dance videos",
      "Vertical 9:16 format",
      "High-quality files",
      "Instant access",
      "Commercial license options",
      "Mix of trending character styles",
    ],
    exclusiveCount: 2,
    unreleasedCount: 1,
  },
  "col-milo-pack": {
    pricing: {
      india: { regularPrice: 1596, salePrice: 799 },
      international: { regularPrice: 50.46, salePrice: 34.99 },
    },
    offer: {
      enabled: true,
      label: "CHARACTER PACK PRICING",
      discountText: "SAVE 50%",
    },
    socialProofText: "Saved by 112 creators",
    valueStack: [
      "4 kinetic Milo routines",
      "Vertical 9:16 format",
      "High-quality files",
      "Instant access",
      "Great for multi-post weeks",
    ],
    exclusiveCount: 1,
    unreleasedCount: 0,
  },
  "col-zara-pack": {
    pricing: {
      india: { regularPrice: 1796, salePrice: 899 },
      international: { regularPrice: 60.96, salePrice: 44.99 },
    },
    offer: {
      enabled: true,
      label: "SPOTLIGHT PACK OFFER",
      discountText: "SAVE 50%",
    },
    socialProofText: "Added to 96 carts this week",
    valueStack: [
      "4 premium Zara routines",
      "Editorial + social ready framing",
      "Vertical 9:16 format",
      "Instant access",
      "License options at checkout",
    ],
    exclusiveCount: 1,
    unreleasedCount: 1,
  },
};

export const creatorTestimonials: CreatorTestimonial[] = [
  {
    id: "t1",
    quote:
      "Used this as the opening visual in a Reel and the comments immediately started asking where the character came from.",
    handle: "@createwithmaya",
    role: "Short-form creator",
    variant: "quote",
    accent: "#FF5C8A",
  },
  {
    id: "t2",
    quote:
      "The character makes people stop because they don't expect to see this kind of movement.",
    handle: "@thecontentlab",
    role: "Creative editor",
    variant: "social",
    accent: "#7C6CFF",
  },
  {
    id: "t3",
    quote:
      "I usually struggle to find visuals that feel different. These gave me an entire week of content ideas.",
    handle: "@reelroom",
    role: "Digital creator",
    variant: "profile",
    accent: "#3DD6C6",
  },
  {
    id: "t4",
    quote:
      "This is the kind of weirdly satisfying content people send to their friends.",
    handle: "@dailycontentclub",
    role: "Short-form creator",
    variant: "quote",
    accent: "#FFB347",
  },
  {
    id: "t5",
    quote:
      "Saved three of these in one session. The formats already feel built for attention.",
    handle: "@loopdesk",
    role: "Content strategist",
    variant: "social",
    accent: "#5B8CFF",
  },
];

export const trendingStripItems: TrendingStripItem[] = [
  {
    id: "ts-1",
    videoId: "vid-001",
    label: "🔥 PULSE DROP",
    metric: "3.3M PLAYS",
  },
  {
    id: "ts-2",
    videoId: "vid-002",
    label: "🚀 NEON SHUFFLE",
    metric: "+186% ENGAGEMENT",
  },
  {
    id: "ts-3",
    videoId: "vid-004",
    label: "↗ SPARK PARADE",
    metric: "14.1K SHARES",
  },
  {
    id: "ts-4",
    videoId: "vid-023",
    label: "💬 GLITCH PARTY",
    metric: "9.4K COMMENTS",
  },
  {
    id: "ts-5",
    videoId: "vid-006",
    label: "👀 SCROLL STOPPER",
    metric: "73% WATCH-THROUGH",
  },
];

export function enrichVideo(video: VideoProduct): VideoProduct {
  const extra = videoConversion[video.id] ?? {};
  return {
    ...video,
    pricing: extra.pricing ?? inferVideoPricing(video.price),
    offer: extra.offer,
    performance: extra.performance,
    activity: extra.activity,
    socialRotation:
      extra.socialRotation ??
      (extra.performance
        ? {
            mode: "demo" as const,
            messages: [
              `${extra.performance.badge} · ${extra.performance.primaryMetric} ${extra.performance.primaryLabel}`,
              extra.performance.insight,
            ],
          }
        : undefined),
    creatorInsights: extra.creatorInsights,
    creatorRating: extra.creatorRating,
    showCardMetrics: extra.showCardMetrics ?? Boolean(extra.performance),
  };
}

export function enrichCollection(collection: Collection): Collection {
  const extra = collectionConversion[collection.id] ?? {};
  const pricing =
    extra.pricing ??
    inferCollectionPricing(collection.price, collection.originalPrice);
  return {
    ...collection,
    pricing,
    offer:
      extra.offer ??
      (pricing.india.salePrice < pricing.india.regularPrice
        ? {
            enabled: true,
            label: "COLLECTION PRICE",
            discountText: "BUNDLE SAVINGS",
          }
        : undefined),
    performance: extra.performance,
    activity: extra.activity,
    socialProofText: extra.socialProofText,
    valueStack: extra.valueStack,
    exclusiveCount: extra.exclusiveCount,
    unreleasedCount: extra.unreleasedCount,
  };
}
