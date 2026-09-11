"use client";

import { ProductPageClient } from "@/components/products/ProductPageClient";
import { use } from "react";

export default function BundleProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ProductPageClient slug={slug} expectedType="BUNDLE" />;
}
