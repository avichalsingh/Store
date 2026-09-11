"use client";

import { CollectionEditor } from "@/admin/components/collections/CollectionEditor";
import { use } from "react";

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CollectionEditor collectionId={id} />;
}
