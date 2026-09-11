"use client";

import { ProductEditor } from "@/admin/components/ProductEditor";
import { ProductTypePicker } from "@/admin/components/products/ProductTypePicker";
import { isProductType, type ProductType } from "@/catalog/productTypes";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NewProductInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const type: ProductType | null = isProductType(typeParam) ? typeParam : null;

  if (!type) {
    return (
      <ProductTypePicker
        onSelect={(next) => {
          router.replace(`/admin/products/new?type=${next}`);
        }}
      />
    );
  }

  return <ProductEditor productType={type} />;
}

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      }
    >
      <NewProductInner />
    </Suspense>
  );
}
