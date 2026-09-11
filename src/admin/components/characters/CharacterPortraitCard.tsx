"use client";

import { MediaLibraryPickerModal } from "@/admin/components/media/MediaLibraryPickerModal";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { useAdmin } from "@/admin/store/AdminProvider";
import { cn } from "@/lib/utils";
import { ImagePlus, Upload, User } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

export function CharacterPortraitCard({
  image,
  onChange,
}: {
  image: string;
  onChange: (image: string) => void;
}) {
  const { mediaAssets } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const hasImage = Boolean(image);
  const src = image;
  const isBlob = src.startsWith("blob:") || src.startsWith("data:");

  const applyFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    onChange(URL.createObjectURL(file));
  };

  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
        Character Portrait
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Used for admin cards, storefront browsing, and the character page header.
      </p>

      <div
        className={cn(
          "relative mx-auto mb-4 flex aspect-[3/4] w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl border bg-[var(--admin-surface-2)]",
          dragging
            ? "border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent-soft)]"
            : "border-[var(--admin-border)]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
      >
        {hasImage ? (
          isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image src={src} alt="" fill className="object-cover" sizes="320px" />
          )
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--admin-surface)] text-[var(--admin-muted)]">
              <User className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[var(--admin-text)]">
              Add a visual identity for this character
            </p>
            <p className="text-xs text-[var(--admin-muted)]">
              Drop an image here or upload below
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          applyFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Image
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={() => setLibraryOpen(true)}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Choose from Media Library
        </AdminButton>
        {hasImage ? (
          <>
            <AdminButton
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={() => onChange("")}>
              Remove
            </AdminButton>
          </>
        ) : null}
      </div>

      <MediaLibraryPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(assetId) => {
          const asset = mediaAssets.find((a) => a.id === assetId);
          if (!asset) return;
          onChange(asset.thumbnail.url || asset.preview.url || "");
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
