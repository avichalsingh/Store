"use client";

import { useMemo, useState } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import Link from "next/link";
import { Download, Heart, Settings, Library } from "lucide-react";
import { mockPurchases } from "@/data/purchases";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { useRegion } from "@/context/RegionContext";
import { usePurchases } from "@/context/PurchaseContext";
import { regionLabel } from "@/lib/pricing";
import { PRODUCT_TYPE_CONFIG, type ProductType } from "@/catalog/productTypes";
import { isProductType } from "@/catalog/productTypes";

const tabs = [
  { id: "library", label: "My Library", icon: Library },
  { id: "purchases", label: "Purchases", icon: Download },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "settings", label: "Account Settings", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "VIDEO", label: "Videos" },
  { id: "AI_IMAGE", label: "Images" },
  { id: "PROMPT", label: "Prompts" },
  { id: "CAPTION_PACK", label: "Caption Packs" },
  { id: "BUNDLE", label: "Bundles" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function resolveProductType(item: {
  type: string;
  productType?: string;
}): string {
  if (item.productType) return item.productType;
  if (item.type === "video") return "VIDEO";
  if (item.type === "collection") return "COLLECTION";
  return "PRODUCT";
}

function libraryCta(productType: string): string {
  if (productType === "VIDEO" || productType === "AI_IMAGE") return "Download";
  if (productType === "COLLECTION") return "Open pack";
  if (productType === "BUNDLE") return "Open bundle";
  return "Open";
}

export default function AccountPage() {
  const [tab, setTab] = useState<TabId>("library");
  const [filter, setFilter] = useState<FilterId>("all");
  const { purchases, hydrated } = usePurchases();

  const libraryItems = useMemo(() => {
    const base = purchases.length > 0 ? purchases : mockPurchases;
    if (filter === "all") return base;
    return base.filter((item) => resolveProductType(item) === filter);
  }, [purchases, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Account
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Your space
          </h1>
          <p className="mt-3 max-w-lg text-muted">
            Access purchased dances, favorites, and settings. Auth comes later —
            this is the structure.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Signed in as <span className="text-text">creator@demo.com</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto hide-scrollbar lg:flex-col lg:overflow-visible">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition",
                tab === item.id
                  ? "bg-accent text-white"
                  : "bg-surface text-text-dim hover:text-text",
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "library" && (
            <div>
              <h2 className="font-display text-2xl font-bold">My Library</h2>
              <p className="mt-1 text-sm text-muted">
                Instant access to everything you&apos;ve purchased.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {FILTERS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                      filter === chip.id
                        ? "bg-accent text-white"
                        : "bg-surface-2 text-text-dim hover:text-text",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {!hydrated ? (
                <div className="mt-8 h-40 animate-pulse rounded-2xl bg-surface-2" />
              ) : libraryItems.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-center">
                  <p className="font-display text-xl font-bold">
                    Nothing in this filter
                  </p>
                  <Link
                    href="/explore"
                    className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Browse shop
                  </Link>
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {libraryItems.map((item) => {
                    const productType = resolveProductType(item);
                    const typeLabel = isProductType(productType)
                      ? PRODUCT_TYPE_CONFIG[productType as ProductType].singular
                      : productType === "COLLECTION"
                        ? "Collection"
                        : productType;
                    const href =
                      item.type === "collection"
                        ? `/collections/${item.productId}`
                        : `/library/${item.productId}`;
                    return (
                      <article key={item.id} className="group">
                        <div className="relative aspect-[9/16] overflow-hidden rounded-2xl ring-1 ring-border">
                          <CoverImage
                            src={item.thumbnail}
                            alt=""
                            fill
                            sizes="200px"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                          <Link
                            href={href}
                            className="absolute bottom-3 left-3 right-3 rounded-full bg-white/15 py-2 text-center text-xs font-semibold text-white backdrop-blur-md transition hover:bg-accent"
                          >
                            {libraryCta(productType)}
                          </Link>
                        </div>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted">
                          {typeLabel}
                          {item.characterName ? ` · ${item.characterName}` : ""}
                        </p>
                        <h3 className="text-sm font-semibold text-text">
                          {item.title}
                        </h3>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "purchases" && (
            <div>
              <h2 className="font-display text-2xl font-bold">Purchases</h2>
              <ul className="mt-6 space-y-3">
                {(purchases.length > 0 ? purchases : mockPurchases).map(
                  (item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3"
                    >
                      <div className="relative h-16 w-12 overflow-hidden rounded-xl">
                        <CoverImage
                          src={item.thumbnail}
                          alt=""
                          fill
                          sizes="48px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted">
                          {resolveProductType(item)} · {item.purchasedAt}
                        </p>
                      </div>
                      {item.type !== "collection" && (
                        <Link
                          href={`/library/${item.productId}`}
                          className="text-xs font-semibold text-accent"
                        >
                          Open
                        </Link>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {tab === "favorites" && (
            <div className="rounded-3xl border border-dashed border-border p-12 text-center">
              <Heart className="mx-auto text-muted" />
              <h2 className="mt-4 font-display text-2xl font-bold">
                No favorites yet
              </h2>
              <p className="mt-2 text-sm text-muted">
                Heart characters and dances while browsing to save them here.
              </p>
              <Link
                href="/explore"
                className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
              >
                Explore videos
              </Link>
            </div>
          )}

          {tab === "settings" && (
            <div className="max-w-lg space-y-6">
              <h2 className="font-display text-2xl font-bold">
                Account Settings
              </h2>
              <div className="space-y-4 rounded-3xl border border-border bg-surface p-6">
                <Field label="Display name" value="Demo Creator" />
                <Field label="Email" value="creator@demo.com" />
                <Field label="Preferred license" value="Standard" />
                <AppearanceField />
                <RegionField />
                <p className="text-xs text-muted">
                  Real account management will connect here once authentication
                  is enabled.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppearanceField() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        Appearance
      </p>
      <div className="mt-2 flex gap-2">
        {(["dark", "light"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium capitalize transition",
              theme === option
                ? "bg-accent text-white"
                : "bg-surface-2 text-text-dim hover:text-text",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function RegionField() {
  const { region, ready } = useRegion();
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        Pricing
      </p>
      <p className="mt-1 text-sm text-text">
        {ready ? regionLabel(region) : "Detecting…"}
      </p>
      <p className="mt-2 text-xs text-muted">
        Currency is set automatically from your location — India sees INR,
        everywhere else sees USD.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm text-text">{value}</p>
    </div>
  );
}
