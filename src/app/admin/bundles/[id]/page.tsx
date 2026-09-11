"use client";

import { BundleEditor } from "@/admin/components/bundles/BundleEditor";
import { use } from "react";

export default function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BundleEditor productId={id} />;
}
