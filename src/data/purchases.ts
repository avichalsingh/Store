import type { PurchasedItem } from "@/types";
import { videoMedia, collectionMedia } from "@/lib/media";

export const mockPurchases: PurchasedItem[] = [
  {
    id: "purchase-1",
    productId: "vid-002",
    title: "Neon Shuffle",
    characterName: "Zara",
    thumbnail: videoMedia("neon-shuffle"),
    purchasedAt: "2026-08-10",
    type: "video",
  },
  {
    id: "purchase-2",
    productId: "vid-001",
    title: "Pulse Drop",
    characterName: "Milo",
    thumbnail: videoMedia("pulse-drop"),
    purchasedAt: "2026-08-08",
    type: "video",
  },
  {
    id: "purchase-3",
    productId: "col-viral-01",
    title: "Viral Moves Collection",
    characterName: "Mixed cast",
    thumbnail: collectionMedia("viral-moves-vol-01"),
    purchasedAt: "2026-07-28",
    type: "collection",
  },
  {
    id: "purchase-4",
    productId: "vid-005",
    title: "Moon Groove",
    characterName: "Kai",
    thumbnail: videoMedia("moon-groove"),
    purchasedAt: "2026-07-15",
    type: "video",
  },
];
