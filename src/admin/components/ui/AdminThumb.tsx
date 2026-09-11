"use client";

import { cn } from "@/lib/utils";
import { Film } from "lucide-react";
import Image from "next/image";

/**
 * Renders a resolved thumbnail URL (blob / data / http / empty).
 * Never invents a decorative fake image — empty shows a structural placeholder.
 */
export function AdminThumb({
  src,
  alt = "",
  className,
  sizes = "80px",
  rounded = "rounded-lg",
}: {
  src: string | undefined | null;
  alt?: string;
  className?: string;
  sizes?: string;
  rounded?: string;
}) {
  if (!src) {
    return (
      <span
        className={cn(
          "flex h-full w-full items-center justify-center bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
          rounded,
          className,
        )}
      >
        <Film className="h-4 w-4 opacity-60" />
      </span>
    );
  }

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", rounded, className)}
      />
    );
  }

  return (
    <span className={cn("relative block h-full w-full overflow-hidden", rounded, className)}>
      <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
    </span>
  );
}
