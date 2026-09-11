import type { Collection, Category } from "@/types";
import { collectionMedia, categoryMedia } from "@/lib/media";
import { enrichCollection } from "@/data/conversion";

const rawCollections: Collection[] = [
  {
    id: "col-viral-01",
    title: "Viral Moves Collection",
    slug: "viral-moves-vol-01",
    description:
      "The dances people can't stop looping. Six high-impact vertical routines engineered for feeds, hooks, and shareable moments.",
    coverImage: collectionMedia("viral-moves-vol-01"),
    videoIds: [
      "vid-001",
      "vid-002",
      "vid-004",
      "vid-006",
      "vid-013",
      "vid-023",
    ],
    price: 49.99,
    originalPrice: 79.94,
    featured: true,
  },
  {
    id: "col-milo-pack",
    title: "Milo Complete Pack",
    slug: "milo-complete-pack",
    description:
      "All of Milo's kinetic energy in one pack — bounce, fire, and turbo-tap routines ready to download.",
    coverImage: collectionMedia("milo-complete-pack"),
    videoIds: ["vid-001", "vid-007", "vid-013", "vid-018"],
    price: 34.99,
    originalPrice: 50.46,
    characterId: "char-milo",
  },
  {
    id: "col-zara-pack",
    title: "Zara Spotlight Pack",
    slug: "zara-spotlight-pack",
    description:
      "Expressive, editorial, and impossible to ignore. Zara's premium routines in a single collection.",
    coverImage: collectionMedia("zara-spotlight-pack"),
    videoIds: ["vid-002", "vid-008", "vid-014", "vid-019"],
    price: 44.99,
    originalPrice: 60.96,
    characterId: "char-zara",
  },
  {
    id: "col-cute-fun",
    title: "Cute & Fun Pack",
    slug: "cute-and-fun-pack",
    description:
      "Bright, playful dances with personality. Perfect for kids' content, joyful brands, and light social edits.",
    coverImage: collectionMedia("cute-and-fun-pack"),
    videoIds: ["vid-003", "vid-007", "vid-010", "vid-017"],
    price: 32.99,
    originalPrice: 46.46,
  },
  {
    id: "col-chill",
    title: "Chill Groove Pack",
    slug: "chill-groove-pack",
    description:
      "Soft motion, liquid timing, and calm energy. Kai's world of understated grooves.",
    coverImage: collectionMedia("chill-groove-pack"),
    videoIds: ["vid-005", "vid-011", "vid-016", "vid-022"],
    price: 29.99,
    originalPrice: 42.46,
    characterId: "char-kai",
  },
  {
    id: "col-nia-pack",
    title: "Nia Personality Pack",
    slug: "nia-personality-pack",
    description:
      "Bold moves and big vibes. Nia's most memorable routines in one downloadable pack.",
    coverImage: collectionMedia("nia-personality-pack"),
    videoIds: ["vid-004", "vid-010", "vid-015", "vid-021"],
    price: 36.99,
    originalPrice: 52.96,
    characterId: "char-nia",
  },
];

export const collections: Collection[] = rawCollections.map(enrichCollection);

export const categories: Category[] = [
  {
    id: "cat-trending",
    name: "Trending",
    slug: "trending",
    image: categoryMedia("trending"),
    videoCount: 10,
  },
  {
    id: "cat-cute",
    name: "Cute & Fun",
    slug: "cute-fun",
    image: categoryMedia("cute-fun"),
    videoCount: 5,
  },
  {
    id: "cat-hiphop",
    name: "Hip Hop",
    slug: "hip-hop",
    image: categoryMedia("hip-hop"),
    videoCount: 4,
  },
  {
    id: "cat-bollywood",
    name: "Bollywood",
    slug: "bollywood",
    image: categoryMedia("bollywood"),
    videoCount: 2,
  },
  {
    id: "cat-funny",
    name: "Funny",
    slug: "funny",
    image: categoryMedia("funny"),
    videoCount: 3,
  },
  {
    id: "cat-viral",
    name: "Viral Moves",
    slug: "viral-moves",
    image: categoryMedia("viral-moves"),
    videoCount: 5,
  },
  {
    id: "cat-chill",
    name: "Chill",
    slug: "chill",
    image: categoryMedia("chill"),
    videoCount: 4,
  },
  {
    id: "cat-group",
    name: "Group Dance",
    slug: "group-dance",
    image: categoryMedia("group-dance"),
    videoCount: 1,
  },
];

export function getCollectionBySlug(slug: string) {
  return collections.find((c) => c.slug === slug);
}

export function getCollectionById(id: string) {
  return collections.find((c) => c.id === id);
}

export function getFeaturedCollection() {
  return collections.find((c) => c.featured) ?? collections[0];
}

export function getCollectionsByCharacter(characterId: string) {
  return collections.filter((c) => c.characterId === characterId);
}
