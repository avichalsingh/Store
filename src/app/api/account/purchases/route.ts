/**
 * Authenticated customer's purchases from verified DB entitlements.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  mapEntitlementsToPurchases,
  type CatalogPurchaseDisplayRow,
  type EntitlementRow,
} from "@/lib/commerce/purchases";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const { data: entitlementRows, error: entErr } = await supabase
    .from("entitlements")
    .select("id, product_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (entErr) {
    return NextResponse.json(
      { ok: false, error: "Could not load entitlements" },
      { status: 500 },
    );
  }

  const entitlements = (entitlementRows || []) as EntitlementRow[];
  if (entitlements.length === 0) {
    return NextResponse.json({ ok: true, purchases: [] });
  }

  const productIds = [...new Set(entitlements.map((e) => e.product_id))];
  const { data: catalogRows, error: catErr } = await supabase
    .from("catalog_products")
    .select("id, name, character_name, product_type, media")
    .in("id", productIds);

  if (catErr) {
    return NextResponse.json(
      { ok: false, error: "Could not load purchase catalog details" },
      { status: 500 },
    );
  }

  const purchases = mapEntitlementsToPurchases(
    entitlements,
    (catalogRows || []) as CatalogPurchaseDisplayRow[],
  );

  return NextResponse.json({ ok: true, purchases });
}
