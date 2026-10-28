/**
 * Create a pending order from trusted DB prices + quantities + Razorpay order.
 * Body: { items: [{ productId, quantity, parentProductId? }] }
 * Never trust client amounts, prices, or totals.
 * Add-on products are identified from product_relationships (ADD_ON), not client flags.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  buildTrustedLine,
  parseCheckoutLines,
  resolveCheckoutAddOnPricing,
  sumPaise,
  type TrustedProductPrice,
} from "@/lib/commerce/pricing";
import {
  createRazorpayOrder,
  getPublicRazorpayKeyId,
  getRazorpayConfig,
} from "@/lib/commerce/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const razorpay = getRazorpayConfig();
  if (!razorpay.ok) {
    return NextResponse.json({ ok: false, error: razorpay.error }, { status: 503 });
  }
  const keyIdPublic = getPublicRazorpayKeyId();
  if (!keyIdPublic) {
    return NextResponse.json(
      { ok: false, error: "Razorpay public key is not configured" },
      { status: 503 },
    );
  }

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseCheckoutLines(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const checkoutLines = parsed;

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server commerce is not configured" },
      { status: 503 },
    );
  }

  const productIds = [...new Set(checkoutLines.map((l) => l.productId))];
  const parentIds = [
    ...new Set(
      checkoutLines
        .map((l) => l.parentProductId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const idsToLoad = [...new Set([...productIds, ...parentIds])];

  const { data: products, error: productsErr } = await admin
    .from("products")
    .select("id, name, status, pricing")
    .in("id", idsToLoad);

  if (productsErr) {
    return NextResponse.json(
      { ok: false, error: "Could not load products" },
      { status: 500 },
    );
  }

  const byId = new Map((products ?? []).map((p) => [p.id as string, p]));

  // Trusted ADD_ON edges where the cart product is the related (child) product.
  const addOnProductIds = new Set<string>();
  const customByParentChild = new Map<string, unknown>();

  const { data: rels, error: relErr } = await admin
    .from("product_relationships")
    .select(
      "product_id, related_product_id, relationship_type, custom_price_inr",
    )
    .in("related_product_id", productIds)
    .eq("relationship_type", "ADD_ON");

  if (relErr) {
    return NextResponse.json(
      { ok: false, error: "Could not load add-on relationships" },
      { status: 500 },
    );
  }

  for (const rel of rels ?? []) {
    const parentId = rel.product_id as string;
    const relatedId = rel.related_product_id as string;
    addOnProductIds.add(relatedId);
    customByParentChild.set(`${parentId}::${relatedId}`, rel.custom_price_inr);
  }

  const lines: TrustedProductPrice[] = [];
  for (const item of checkoutLines) {
    const row = byId.get(item.productId);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: `Unknown product ${item.productId}` },
        { status: 400 },
      );
    }

    const parentRow = item.parentProductId
      ? byId.get(item.parentProductId)
      : undefined;

    const addOnCtx = resolveCheckoutAddOnPricing({
      productId: item.productId,
      parentProductId: item.parentProductId,
      addOnProductIds,
      customByParentChild,
      parentExists: Boolean(parentRow),
      parentStatus: (parentRow?.status as string | undefined) ?? null,
    });
    if ("error" in addOnCtx) {
      return NextResponse.json({ ok: false, error: addOnCtx.error }, { status: 400 });
    }

    const line = buildTrustedLine({
      productId: row.id as string,
      productName: (row.name as string) || item.productId,
      pricing: row.pricing,
      status: row.status as string,
      quantity: item.quantity,
      parentProductId: addOnCtx.parentProductId,
      addOnCustomPriceInr: addOnCtx.addOnCustomPriceInr,
    });
    if ("error" in line) {
      return NextResponse.json({ ok: false, error: line.error }, { status: 400 });
    }
    lines.push(line);
  }

  const amountPaise = sumPaise(lines);
  if (amountPaise < 100) {
    return NextResponse.json(
      { ok: false, error: "Order total below Razorpay minimum" },
      { status: 400 },
    );
  }

  const receipt = `rhy_${Date.now().toString(36)}_${user.id.slice(0, 8)}`;

  const { data: orderRow, error: insertErr } = await admin
    .from("orders")
    .insert({
      user_id: user.id,
      status: "pending",
      currency: "INR",
      amount_paise: amountPaise,
      receipt,
    })
    .select("id")
    .single();

  if (insertErr || !orderRow?.id) {
    return NextResponse.json(
      { ok: false, error: "Could not create order" },
      { status: 500 },
    );
  }

  const orderId = orderRow.id as string;

  const { error: itemsErr } = await admin.from("order_items").insert(
    lines.map((line) => ({
      order_id: orderId,
      product_id: line.productId,
      product_name: line.productName,
      unit_amount_paise: line.unitAmountPaise,
      quantity: line.quantity,
    })),
  );

  if (itemsErr) {
    await admin.from("orders").delete().eq("id", orderId);
    return NextResponse.json(
      { ok: false, error: "Could not create order items" },
      { status: 500 },
    );
  }

  const rz = await createRazorpayOrder({
    keyId: razorpay.config.keyId,
    keySecret: razorpay.config.keySecret,
    amountPaise,
    currency: "INR",
    receipt,
    notes: { rhythm_order_id: orderId, user_id: user.id },
  });

  if (!rz.ok) {
    await admin.from("orders").update({ status: "failed" }).eq("id", orderId);
    return NextResponse.json({ ok: false, error: rz.error }, { status: 502 });
  }

  if (rz.order.amount !== amountPaise) {
    await admin.from("orders").update({ status: "failed" }).eq("id", orderId);
    return NextResponse.json(
      { ok: false, error: "Razorpay amount mismatch" },
      { status: 502 },
    );
  }

  const { error: linkErr } = await admin
    .from("orders")
    .update({ razorpay_order_id: rz.order.id })
    .eq("id", orderId);

  if (linkErr) {
    return NextResponse.json(
      { ok: false, error: "Could not link Razorpay order" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    orderId,
    razorpayOrderId: rz.order.id,
    amountPaise,
    currency: "INR",
    keyId: keyIdPublic,
    lines: lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitAmountPaise: l.unitAmountPaise,
      lineAmountPaise: l.lineAmountPaise,
      parentProductId: l.parentProductId,
    })),
  });
}
