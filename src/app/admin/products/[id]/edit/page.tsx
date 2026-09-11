"use client";

import { ProductEditor } from "@/admin/components/ProductEditor";
import { use } from "react";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductEditor productId={id} />;
}
