"use client";

import { CaptionPageClient } from "@/components/products/caption-pdp/CaptionPageClient";
import { use } from "react";

export default function CaptionProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <CaptionPageClient slug={slug} />;
}
