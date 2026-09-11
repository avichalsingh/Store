"use client";

import { PromptPageClient } from "@/components/products/prompt-pdp/PromptPageClient";
import { use } from "react";

export default function PromptProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <PromptPageClient slug={slug} />;
}
