"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/admin/components/ui/AdminField";
import { uid } from "@/admin/lib/format";
import {
  blankCaptionPackItem,
  type CaptionPackData,
  type CaptionPackItem,
} from "@/catalog/productPayloads";
import { HASHTAGS_PER_SET } from "@/catalog/productTypes";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

function normalizeTags(tags: string[]): string[] {
  const next = [...tags];
  while (next.length < HASHTAGS_PER_SET) next.push("");
  return next.slice(0, HASHTAGS_PER_SET);
}

function hashtagsToInputValue(hashtags: string[] | undefined): string {
  return (hashtags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

function parseHashtagParts(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function HashtagsField({
  itemId,
  hashtags,
  onHashtagsChange,
}: {
  itemId: string;
  hashtags: string[];
  onHashtagsChange: (hashtags: string[]) => void;
}) {
  const [input, setInput] = useState(() => hashtagsToInputValue(hashtags));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(hashtagsToInputValue(hashtags));
    setError(null);
    // Reset display when switching items (duplicate, load), not on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemId scopes the reset
  }, [itemId]);

  const handleChange = (raw: string) => {
    setInput(raw);
    const parts = parseHashtagParts(raw);
    if (parts.length > HASHTAGS_PER_SET) {
      setError(`Maximum ${HASHTAGS_PER_SET} hashtags per item.`);
      return;
    }
    setError(null);
    onHashtagsChange(normalizeTags(parts));
  };

  return (
    <AdminField label="Hashtags">
      <AdminInput
        value={input}
        placeholder="#waitforit, #reels, #twist, #viral, #fyp"
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      <p className="mt-1.5 text-xs text-[var(--admin-muted)]">
        Up to {HASHTAGS_PER_SET} hashtags, separated by commas
      </p>
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--admin-danger,#e5484d)]">
          {error}
        </p>
      ) : null}
    </AdminField>
  );
}

export function CaptionPackTypeEditor({
  data,
  onChange,
}: {
  data: CaptionPackData;
  onChange: (d: CaptionPackData) => void;
}) {
  const items = data.items ?? [];

  const updateAt = (index: number, patch: Partial<CaptionPackItem>) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange({ items: next });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange({ items: next });
  };

  const duplicate = (index: number) => {
    const src = items[index];
    const copy: CaptionPackItem = {
      ...src,
      id: uid("item"),
      hashtags: [...(src.hashtags ?? [])],
      label: src.label ? `${src.label} (copy)` : "",
    };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange({ items: next });
  };

  const remove = (index: number) => {
    onChange({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <AdminCard>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Caption + hashtag items
          </h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {items.length} item{items.length === 1 ? "" : "s"} · each caption
            ships with matching hashtags
          </p>
        </div>
        <AdminButton
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange({
              items: [...items, { ...blankCaptionPackItem(), id: uid("item") }],
            })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add item
        </AdminButton>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">
          No items yet. Add the first caption + hashtag combination.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--admin-border)] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--admin-muted)]">
                    Item {index + 1}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicate(index)}
                      aria-label="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(index)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AdminButton>
                  </div>
                </div>
                <div className="grid gap-3">
                  <AdminField label="Caption">
                    <AdminTextarea
                      value={item.caption}
                      onChange={(e) =>
                        updateAt(index, { caption: e.target.value })
                      }
                    />
                  </AdminField>
                  <div className="grid gap-3 md:grid-cols-2">
                    <AdminField label="Label">
                      <AdminInput
                        value={item.label ?? ""}
                        onChange={(e) =>
                          updateAt(index, { label: e.target.value })
                        }
                      />
                    </AdminField>
                    <AdminField label="Notes">
                      <AdminInput
                        value={item.notes ?? ""}
                        onChange={(e) =>
                          updateAt(index, { notes: e.target.value })
                        }
                      />
                    </AdminField>
                  </div>
                  <HashtagsField
                    itemId={item.id}
                    hashtags={item.hashtags ?? []}
                    onHashtagsChange={(hashtags) =>
                      updateAt(index, { hashtags })
                    }
                  />
                </div>
              </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}
