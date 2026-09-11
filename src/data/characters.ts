import type { Character } from "@/types";
import { characterMedia } from "@/lib/media";

export const characters: Character[] = [
  {
    id: "char-milo",
    name: "Milo",
    slug: "milo",
    description:
      "Milo never waits for the drop — he finds it. Sharp footwork, wild energy, and a grin that sells every move.",
    shortDescription: "Energetic, playful, always finding the beat.",
    image: characterMedia("milo"),
    accentColor: "#FF5C8A",
    videoCount: 8,
    collectionCount: 2,
  },
  {
    id: "char-zara",
    name: "Zara",
    slug: "zara",
    description:
      "Zara owns the frame. Confident isolations, expressive hands, and choreography that feels like a spotlight.",
    shortDescription: "Confident, expressive, impossible to ignore.",
    image: characterMedia("zara"),
    accentColor: "#7C6CFF",
    videoCount: 7,
    collectionCount: 2,
  },
  {
    id: "char-leo",
    name: "Leo",
    slug: "leo",
    description:
      "Leo experiments. Cool posture, curious rhythm switches, and moves that feel freshly invented every take.",
    shortDescription: "Cool, curious, always trying something new.",
    image: characterMedia("leo"),
    accentColor: "#3DD6C6",
    videoCount: 6,
    collectionCount: 1,
  },
  {
    id: "char-nia",
    name: "Nia",
    slug: "nia",
    description:
      "Nia brings big personality to every routine — bold timing, playful attitude, and dances that stick in your feed.",
    shortDescription: "Bold moves, big personality.",
    image: characterMedia("nia"),
    accentColor: "#FFB347",
    videoCount: 7,
    collectionCount: 2,
  },
  {
    id: "char-kai",
    name: "Kai",
    slug: "kai",
    description:
      "Kai moves like liquid. Smooth transitions, chill grooves, and a calm presence that still hits hard.",
    shortDescription: "Smooth, chill, quietly magnetic.",
    image: characterMedia("kai"),
    accentColor: "#5B8CFF",
    videoCount: 5,
    collectionCount: 1,
  },
  {
    id: "char-rio",
    name: "Rio",
    slug: "rio",
    description:
      "Rio turns every track into a party. Funny beats, viral timing, and dances made to get shared.",
    shortDescription: "Funny, viral, built for the scroll.",
    image: characterMedia("rio"),
    accentColor: "#FF6B4A",
    videoCount: 5,
    collectionCount: 1,
  },
];

export function getCharacterBySlug(slug: string) {
  return characters.find((c) => c.slug === slug);
}

export function getCharacterById(id: string) {
  return characters.find((c) => c.id === id);
}
