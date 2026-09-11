"use client";

import { ImagePageClient } from "@/components/products/ImagePageClient";
import { use } from "react";

export default function ImageProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ImagePageClient slug={slug} />;
}
