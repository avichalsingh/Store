"use client";

import { ToolDetailClient } from "@/components/tools/ToolDetailClient";
import { use } from "react";

export default function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ToolDetailClient slug={slug} />;
}
