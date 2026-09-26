"use client";

import { CharacterAboutCard } from "@/admin/components/characters/CharacterAboutCard";
import { CharacterAccentCard } from "@/admin/components/characters/CharacterAccentCard";
import { CharacterAddProductsModal } from "@/admin/components/characters/CharacterAddProductsModal";
import { CharacterCollectionsSection } from "@/admin/components/characters/CharacterCollectionsSection";
import { CharacterIdentityCard } from "@/admin/components/characters/CharacterIdentityCard";
import { CharacterLivePreview } from "@/admin/components/characters/CharacterLivePreview";
import { CharacterPageSection } from "@/admin/components/characters/CharacterPageSection";
import { CharacterPortraitCard } from "@/admin/components/characters/CharacterPortraitCard";
import { CharacterProductsSection } from "@/admin/components/characters/CharacterProductsSection";
import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  deriveCharacterMetrics,
  formatCompactNumber,
  getCharacterCollections,
  getCharacterProducts,
  normalizeCharacter,
  recomputeCharacterCounts,
} from "@/admin/lib/characterHelpers";
import { formatDateTime, formatInr, slugify, uid } from "@/admin/lib/format";
import { publishCharacterToCatalog } from "@/admin/lib/publishToCatalog";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCharacter } from "@/admin/types";
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function blankCharacter(): AdminCharacter {
  const stamp = new Date().toISOString();
  return normalizeCharacter({
    id: uid("char"),
    name: "",
    slug: "",
    image: "",
    shortBio: "",
    description: "",
    accentColor: "#e23d73",
    status: "draft",
    featured: false,
    showOnCharactersPage: true,
    showProductsOnPage: true,
    showCollectionsOnPage: true,
    productCount: 0,
    collectionCount: 0,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export function CharacterEditor({
  characterId,
  isNew,
}: {
  characterId?: string;
  isNew?: boolean;
}) {
  const router = useRouter();
  const {
    characters,
    products,
    collections,
    upsertCharacter,
    duplicateCharacter,
    deleteCharacter,
    assignProductsToCharacter,
    removeProductFromCharacter,
    hydrated,
    pushToast,
  } = useAdmin();

  const existing = useMemo(() => {
    if (isNew || !characterId) return undefined;
    return characters.find(
      (c) => c.id === characterId || c.slug === characterId,
    );
  }, [characters, characterId, isNew]);

  const [draft, setDraft] = useState<AdminCharacter | null>(null);
  const [baseline, setBaseline] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isNew && characterId && !existing) return;
    const initial = existing
      ? normalizeCharacter(structuredClone(existing))
      : blankCharacter();
    setDraft(initial);
    setBaseline(JSON.stringify(initial));
    setSlugTouched(!!existing?.slug);
    setSavedAt(existing?.updatedAt ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, characterId, isNew]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  const characterProducts = useMemo(() => {
    if (!draft) return [];
    return getCharacterProducts(draft.id, products);
  }, [draft, products]);

  const characterCollections = useMemo(() => {
    if (!draft) return [];
    return getCharacterCollections(draft.id, products, collections);
  }, [draft, products, collections]);

  const metrics = useMemo(() => {
    if (!draft) return { plays: 0, saves: 0, revenueInr: 0 };
    return deriveCharacterMetrics(draft.id, products);
  }, [draft, products]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const confirmLeave = () => {
    if (!dirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave this page and discard them?",
    );
  };

  if (!hydrated || !draft) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  if (!isNew && characterId && !existing) {
    return (
      <p className="text-sm text-[var(--admin-danger)]">Character not found.</p>
    );
  }

  const patch = (partial: Partial<AdminCharacter>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  };

  const prepareSave = (): AdminCharacter => {
    const next = normalizeCharacter({
      ...draft,
      slug: draft.slug || slugify(draft.name) || `character-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
    return recomputeCharacterCounts(next, products, collections);
  };

  const save = () => {
    const saved = prepareSave();
    upsertCharacter(saved, "Character saved");
    setDraft(saved);
    setBaseline(JSON.stringify(saved));
    setSavedAt(saved.updatedAt);
    if (isNew) {
      router.replace(`/admin/characters/${saved.id}`);
    }
  };

  const publish = async () => {
    if (!draft || publishing) return;
    const saved = prepareSave();
    upsertCharacter(saved);
    setDraft(saved);
    setBaseline(JSON.stringify(saved));
    setSavedAt(saved.updatedAt);
    if (isNew) {
      router.replace(`/admin/characters/${saved.id}`);
    }
    setPublishing(true);
    try {
      const result = await publishCharacterToCatalog(saved);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      pushToast("Character published to catalog");
    } finally {
      setPublishing(false);
    }
  };

  const portraitSrc = draft.image;
  const portraitBlob =
    !!portraitSrc &&
    (portraitSrc.startsWith("blob:") || portraitSrc.startsWith("data:"));

  return (
    <div className="pb-16">
      <nav className="mb-3 flex items-center gap-1 text-xs text-[var(--admin-muted)]">
        <Link
          href="/admin/characters"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
          className="hover:text-[var(--admin-text)]"
        >
          Characters
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--admin-text)]">
          {draft.name || "New Character"}
        </span>
      </nav>

      <AdminPageHeader
        title={isNew || !existing ? "New Character" : "Edit Character"}
        description="Manage this character's profile, products, and storefront page."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                Unsaved changes
              </span>
            ) : savedAt ? (
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-success)]">
                <Check className="h-3.5 w-3.5" />
                All changes saved
              </span>
            ) : null}
            <AdminButton
              variant="secondary"
              onClick={() => {
                if (!confirmLeave()) return;
                router.push("/admin/characters");
              }}
            >
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={save}>
              Save Changes
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={publishing || !draft.name.trim()}
              onClick={() => void publish()}
            >
              <Upload className="h-4 w-4" />
              {publishing ? "Publishing…" : "Publish character"}
            </AdminButton>
            {!isNew && existing ? (
              <div className="relative" ref={moreRef}>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  aria-label="More actions"
                  onClick={() => setMoreOpen((o) => !o)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </AdminButton>
                {moreOpen ? (
                  <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-[var(--admin-shadow-md)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--admin-surface-2)]"
                      onClick={() => {
                        const copy = duplicateCharacter(draft.id);
                        setMoreOpen(false);
                        if (copy) router.push(`/admin/characters/${copy.id}`);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)]"
                      onClick={() => {
                        setMoreOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <AdminCard>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative mx-auto h-48 w-36 shrink-0 overflow-hidden rounded-2xl bg-[var(--admin-surface-2)] sm:mx-0">
                {draft.image ? (
                  portraitBlob ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={portraitSrc}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={portraitSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--admin-muted)]">
                    No portrait
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold">
                    {draft.name || "Untitled character"}
                  </h2>
                  <StatusBadge status={draft.status} />
                </div>
                <p className="text-sm text-[var(--admin-muted)]">
                  {draft.shortBio || "Add a short bio to introduce this character."}
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <strong>{characterProducts.length}</strong>{" "}
                    <span className="text-[var(--admin-muted)]">products</span>
                  </span>
                  <span>
                    <strong>{characterCollections.length}</strong>{" "}
                    <span className="text-[var(--admin-muted)]">
                      collections
                    </span>
                  </span>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Demo metrics
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      <strong>{formatCompactNumber(metrics.plays)}</strong>{" "}
                      <span className="text-[var(--admin-muted)]">plays</span>
                    </span>
                    <span>
                      <strong>{formatCompactNumber(metrics.saves)}</strong>{" "}
                      <span className="text-[var(--admin-muted)]">saves</span>
                    </span>
                    <span>
                      <strong>{formatInr(metrics.revenueInr)}</strong>{" "}
                      <span className="text-[var(--admin-muted)]">revenue</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {draft.slug ? (
                    <Link
                      href={`/characters/${draft.slug}`}
                      target="_blank"
                      className="inline-flex"
                    >
                      <AdminButton variant="secondary" size="sm">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Character Page
                      </AdminButton>
                    </Link>
                  ) : null}
                  <AdminButton variant="primary" size="sm" onClick={save}>
                    Save Changes
                  </AdminButton>
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard>
            <CharacterIdentityCard
              draft={draft}
              slugTouched={slugTouched}
              onSlugTouched={() => setSlugTouched(true)}
              onChange={patch}
            />
          </AdminCard>

          <AdminCard>
            <CharacterPortraitCard
              image={draft.image}
              onChange={(image) => patch({ image })}
            />
          </AdminCard>

          <AdminCard>
            <CharacterAboutCard draft={draft} onChange={patch} />
          </AdminCard>

          <AdminCard>
            <CharacterAccentCard
              accentColor={draft.accentColor}
              onChange={(accentColor) => patch({ accentColor })}
            />
          </AdminCard>

          <AdminCard>
            <CharacterProductsSection
              characterName={draft.name}
              products={characterProducts}
              collections={collections}
              onAdd={() => setAddOpen(true)}
              onRemove={(productId) =>
                removeProductFromCharacter(productId, draft.id)
              }
            />
          </AdminCard>

          <AdminCard>
            <CharacterCollectionsSection
              characterName={draft.name}
              characterId={draft.id}
              collections={characterCollections}
              products={products}
            />
          </AdminCard>

          <AdminCard>
            <CharacterPageSection
              draft={draft}
              products={characterProducts}
              collections={characterCollections}
              onChange={patch}
            />
          </AdminCard>

          {!isNew && existing ? (
            <AdminCard className="border-[var(--admin-danger)]/30">
              <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold text-[var(--admin-danger)]">
                Danger zone
              </h2>
              <p className="mb-4 text-xs text-[var(--admin-muted)]">
                Deleting a character does not delete products. Linked products
                are reassigned to another character.
              </p>
              <AdminButton
                variant="danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete character
              </AdminButton>
            </AdminCard>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <AdminCard>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Character status
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Status</dt>
                <dd className="capitalize">{draft.status}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Featured</dt>
                <dd>{draft.featured ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Products</dt>
                <dd>{characterProducts.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Collections</dt>
                <dd>{characterCollections.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Accent</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: draft.accentColor }}
                  />
                  <span className="font-mono text-xs uppercase">
                    {draft.accentColor}
                  </span>
                </dd>
              </div>
            </dl>
          </AdminCard>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Live Preview
            </h3>
            <CharacterLivePreview
              character={draft}
              productCount={characterProducts.length}
            />
          </div>

          <AdminCard>
            <p className="text-xs text-[var(--admin-muted)]">
              {dirty ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                  Unsaved changes
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-success)]">
                  <Check className="h-3.5 w-3.5" />
                  Last saved {formatDateTime(savedAt)}
                </span>
              ) : (
                "Not saved yet"
              )}
            </p>
          </AdminCard>
        </aside>
      </div>

      <CharacterAddProductsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        products={products}
        characters={characters}
        characterId={draft.id}
        onAdd={(ids) => {
          // Persist draft first so new characters exist before assignment
          if (isNew || dirty) {
            const saved = prepareSave();
            upsertCharacter(saved, "Character saved");
            setDraft(saved);
            setBaseline(JSON.stringify(saved));
            setSavedAt(saved.updatedAt);
            if (isNew) router.replace(`/admin/characters/${saved.id}`);
            assignProductsToCharacter(saved.id, ids);
          } else {
            assignProductsToCharacter(draft.id, ids);
          }
        }}
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        danger
        title={`Delete "${draft.name || "Character"}"?`}
        description="Products will not be deleted. They will be reassigned to another character so the catalog stays valid."
        confirmLabel="Delete Character"
        onConfirm={() => {
          deleteCharacter(draft.id);
          router.push("/admin/characters");
        }}
      />
    </div>
  );
}
