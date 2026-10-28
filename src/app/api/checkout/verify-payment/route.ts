/**
 * Client return-path verification: signature + Razorpay fetch; capture-only fulfill.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  fetchRazorpayPayment,
  getRazorpayConfig,
  verifyPaymentSignature,
} from "@/lib/commerce/razorpay";
import {
  fulfillPaidOrder,
  isCapturedPaymentStatus,
  markPaymentEventFailed,
  markPaymentEventProcessed,
  upsertPaymentEventReceived,
} from "@/lib/commerce/fulfill";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const razorpay = getRazorpayConfig();
  if (!razorpay.ok) {
    return NextResponse.json({ ok: false, error: razorpay.error }, { status: 503 });
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

  let body: {
    orderId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const razorpayOrderId = body.razorpayOrderId?.trim();
  const razorpayPaymentId = body.razorpayPaymentId?.trim();
  const razorpaySignature = body.razorpaySignature?.trim();

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { ok: false, error: "Missing verification fields" },
      { status: 400 },
    );
  }

  const sigOk = verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    keySecret: razorpay.config.keySecret,
  });
  if (!sigOk) {
    return NextResponse.json(
      { ok: false, error: "Invalid payment signature", code: "BAD_SIGNATURE" },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server commerce is not configured" },
      { status: 503 },
    );
  }

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, user_id, amount_paise, razorpay_order_id, status, currency")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }
  if (order.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (order.razorpay_order_id !== razorpayOrderId) {
    return NextResponse.json(
      { ok: false, error: "Order mismatch" },
      { status: 400 },
    );
  }
  if ((order.currency as string) !== "INR") {
    return NextResponse.json(
      { ok: false, error: "Unsupported order currency" },
      { status: 400 },
    );
  }

  const payment = await fetchRazorpayPayment({
    keyId: razorpay.config.keyId,
    keySecret: razorpay.config.keySecret,
    paymentId: razorpayPaymentId,
  });
  if (!payment.ok) {
    return NextResponse.json({ ok: false, error: payment.error }, { status: 502 });
  }

  const p = payment.payment;
  if (p.order_id !== razorpayOrderId) {
    return NextResponse.json(
      { ok: false, error: "Payment order mismatch" },
      { status: 400 },
    );
  }
  if (p.amount !== order.amount_paise || p.currency.toUpperCase() !== "INR") {
    return NextResponse.json(
      { ok: false, error: "Payment amount/currency mismatch" },
      { status: 400 },
    );
  }
  if (!isCapturedPaymentStatus(p.status)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Payment not captured (${p.status})`,
        code: "PAYMENT_NOT_CAPTURED",
      },
      { status: 402 },
    );
  }

  const eventId = `verify:${razorpayPaymentId}`;
  const recorded = await upsertPaymentEventReceived(admin, {
    eventId,
    eventType: "client.verify",
    razorpayOrderId,
    razorpayPaymentId,
    orderId,
    payload: {
      source: "verify-payment",
      status: p.status,
      amount: p.amount,
    },
  });
  if (!recorded.ok) {
    return NextResponse.json({ ok: false, error: recorded.error }, { status: 500 });
  }

  // Always attempt fulfill (RPC is idempotent and backfills entitlements).
  const fulfilled = await fulfillPaidOrder(admin, {
    orderId,
    razorpayPaymentId,
    expectedRazorpayOrderId: razorpayOrderId,
    expectedAmountPaise: order.amount_paise as number,
  });

  if (!fulfilled.ok) {
    await markPaymentEventFailed(admin, eventId, fulfilled.error);
    return NextResponse.json({ ok: false, error: fulfilled.error }, { status: 500 });
  }

  await markPaymentEventProcessed(admin, eventId, orderId);

  return NextResponse.json({
    ok: true,
    orderId,
    alreadyPaid: fulfilled.alreadyPaid,
    entitlementCount: fulfilled.entitlementCount,
  });
}
