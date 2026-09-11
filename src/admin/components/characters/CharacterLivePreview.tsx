"use client";

import type { AdminCharacter } from "@/admin/types";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function CharacterLivePreview({
  character,
  productCount,
}: {
  character: AdminCharacter;
  productCount: number;
}) {
  const img = character.image;
  const isBlob =
    !!img && (img.startsWith("blob:") || img.startsWith("data:"));

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)]"
      style={{
        borderColor: `${character.accentColor}55`,
        boxShadow: `0 0 0 1px ${character.accentColor}22, 0 8px 24px ${character.accentColor}14`,
      }}
    >
      <div className="relative aspect-[3/4] w-full bg-[var(--admin-surface-2)]">
        {img ? (
          isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={img}
              alt=""
              fill
              className="object-cover"
              sizes="320px"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--admin-muted)]">
            No portrait
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t to-transparent"
          style={{
            backgroundImage: `linear-gradient(to top, ${character.accentColor}99, transparent)`,
          }}
        />
        {character.featured ? (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow"
            style={{ background: character.accentColor }}
          >
            <Star className="h-3 w-3 fill-current" />
            Featured
          </span>
        ) : (
          <span
            className="absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/95 shadow"
            style={{ background: `${character.accentColor}cc` }}
          >
            Trending Character
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="font-[family-name:var(--font-syne)] text-lg font-semibold text-[var(--admin-text)]">
          {character.name || "Untitled character"}
        </p>
        <p className="line-clamp-2 text-xs text-[var(--admin-muted)]">
          {character.shortBio || "Short bio appears here."}
        </p>
        <p className="text-xs text-[var(--admin-muted)]">
          {productCount} {productCount === 1 ? "Video" : "Videos"}
        </p>
        {character.slug ? (
          <Link
            href={`/characters/${character.slug}`}
            target="_blank"
            className="mt-1 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: character.accentColor || "var(--admin-accent)" }}
          >
            View Character
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="mt-1 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[var(--admin-surface-2)] px-3 py-2 text-sm font-medium text-[var(--admin-muted)]"
          >
            View Character
          </button>
        )}
      </div>
    </div>
  );
}
