"use client";

import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  getCharacterCollections,
  getCharacterProducts,
  normalizeCharacter,
} from "@/admin/lib/characterHelpers";
import { useAdmin } from "@/admin/store/AdminProvider";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CharactersPage() {
  const router = useRouter();
  const { characters, products, collections, hydrated } = useAdmin();

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Characters"
        description="Cast of AI performers powering the catalog."
        actions={
          <Link href="/admin/characters/new">
            <AdminButton variant="primary">Add character</AdminButton>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((raw) => {
          const c = normalizeCharacter(raw);
          const productCount = getCharacterProducts(c.id, products).length;
          const collectionCount = getCharacterCollections(
            c.id,
            products,
            collections,
          ).length;
          const img = c.image;
          const isBlob =
            !!img && (img.startsWith("blob:") || img.startsWith("data:"));

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => router.push(`/admin/characters/${c.id}`)}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-left shadow-[var(--admin-shadow-sm)] transition hover:border-[var(--admin-accent)]/40"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-16 w-14 overflow-hidden rounded-2xl bg-[var(--admin-surface-2)]">
                  {img ? (
                    isBlob ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-[var(--admin-muted)]">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-[family-name:var(--font-syne)] font-semibold">
                      {c.name}
                    </p>
                    <StatusBadge status={c.status} />
                    {c.featured ? (
                      <AdminBadge tone="accent" className="gap-0.5">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Featured
                      </AdminBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--admin-muted)]">
                    {c.shortBio}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--admin-muted)]">
                    {productCount} products · {collectionCount} collections
                  </p>
                </div>
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ background: c.accentColor }}
                  title={c.accentColor}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
