"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { useCart } from "@/context/CartContext";
import { useRegion } from "@/context/RegionContext";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatPrice, getCollectionQuote, getVideoQuote } from "@/lib/pricing";

export function CartUpsells({ onNavigate }: { onNavigate?: () => void }) {
  const { items } = useCart();
  const { region, ready } = useRegion();
  const { videos, collections, getVideoById } = useCatalog();
  if (items.length === 0) return null;

  const videoItems = items.filter((i) => i.type === "video");
  const lastVideo = getVideoById(
    videoItems[videoItems.length - 1]?.productId ?? "",
  );

  const related = lastVideo
    ? videos
        .filter(
          (v) =>
            v.id !== lastVideo.id &&
            !items.some((i) => i.productId === v.id) &&
            (v.characterId === lastVideo.characterId ||
              v.category === lastVideo.category),
        )
        .slice(0, 3)
    : videos.filter((v) => !items.some((i) => i.productId === v.id)).slice(0, 3);

  const characterCounts = videoItems.reduce<Record<string, number>>(
    (acc, item) => {
      const video = getVideoById(item.productId);
      if (!video) return acc;
      const characterId = video.characterId ?? "";
      if (!characterId) return acc;
      acc[characterId] = (acc[characterId] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const bundleHint = Object.entries(characterCounts)
    .filter(([, count]) => count >= 2)
    .map(([characterId, count]) => {
      const pack = collections.find((c) => c.characterId === characterId);
      const sample = videos.find((v) => v.characterId === characterId);
      if (!pack || !sample) return null;
      const ownedIds = new Set(
        videoItems
          .map((i) => i.productId)
          .filter(
            (id) => getVideoById(id)?.characterId === characterId,
          ),
      );
      const remaining = pack.videoIds.filter((id) => !ownedIds.has(id)).length;
      if (remaining <= 0) return null;
      const selectionValue = videoItems
        .filter((item) => ownedIds.has(item.productId))
        .reduce((sum, item) => {
          const video = getVideoById(item.productId);
          return video ? sum + getVideoQuote(video, region).current : sum;
        }, 0);
      const packQuote = getCollectionQuote(pack, region);
      return {
        pack,
        characterName: sample.characterName,
        count,
        remaining,
        selectionValue,
        packQuote,
      };
    })
    .find(Boolean);

  return (
    <div className="mt-6 space-y-5 border-t border-border pt-5">
      {bundleHint ? (
        <div className="rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            🔥 You&apos;re already building {bundleHint.characterName}&apos;s
            collection
          </p>
          <p className="mt-2 text-sm font-semibold text-text">
            You&apos;re only {bundleHint.remaining}{" "}
            {bundleHint.remaining === 1 ? "video" : "videos"} away from the full
            collection.
          </p>
          <p className="mt-2 text-xs text-muted">
            Current selection value:{" "}
            {ready ? formatPrice(bundleHint.selectionValue, region) : "—"}
            <br />
            Full collection:{" "}
            {ready
              ? formatPrice(bundleHint.packQuote.current, region)
              : "—"}
            <br />
            Additional value unlocked: {bundleHint.remaining} more{" "}
            {bundleHint.remaining === 1 ? "video" : "videos"}
          </p>
          <Link
            href={`/collections/${bundleHint.pack.slug}`}
            onClick={onNavigate}
            className="mt-3 inline-flex text-sm font-semibold text-accent hover:brightness-110"
          >
            ⚡ View full collection →
          </Link>
        </div>
      ) : null}

      {related.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Creators who picked this also explored
          </p>
          <ul className="mt-3 space-y-2">
            {related.map((video) => {
              const quote = getVideoQuote(video, region);
              return (
                <li key={video.id}>
                  <Link
                    href={`/videos/${video.slug}`}
                    onClick={onNavigate}
                    className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-surface-2"
                  >
                    <div className="relative h-14 w-10 overflow-hidden rounded-lg">
                      <CoverImage
                        src={video.thumbnail}
                        alt=""
                        fill
                        sizes="40px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {video.title}
                      </p>
                      <p className="text-xs text-muted">
                        {video.characterName} ·{" "}
                        {ready ? formatPrice(quote.current, region) : "—"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
