"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type CoverImageProps = Omit<ImageProps, "onError">;

function isRuntimeUrl(src: ImageProps["src"]): src is string {
  return (
    typeof src === "string" &&
    (src.startsWith("blob:") || src.startsWith("data:"))
  );
}

export function CoverImage({
  src,
  alt,
  className,
  fill,
  ...props
}: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const fallback =
    typeof src === "string" ? src.replace(/\.jpe?g(\?.*)?$/i, ".svg") : "";

  if (isRuntimeUrl(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          fill && "absolute inset-0 h-full w-full",
          "object-cover",
          className,
        )}
      />
    );
  }

  if (failed && fallback && fallback !== (typeof src === "string" ? src : "")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallback}
        alt={alt}
        className={cn(
          fill && "absolute inset-0 h-full w-full",
          "object-cover",
          className,
        )}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
