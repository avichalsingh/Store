/**
 * Razorpay webhooks — raw-body signature verify; retry-safe event processing.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  getRazorpayConfig,
  verifyWebhookSignature,
} from "@/lib/commerce/razorpay";
import {
  fulfillPaidOrder,
  isCapturedPaymentStatus,
  markPaymentEventFailed,
  markPaymentEventProcessed,
  paymentEventNeedsFulfillment,
  shouldFulfillRazorpayEvent,
  upsertPaymentEventReceived,
} from "@/lib/commerce/fulfill";

export const runtime = "nodejs";

type RazorpayWebhookBody = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        notes?: { rhythm_order_id?: string };
      };
    };
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        notes?: { rhythm_order_id?: string };
      };
    };
  };
};

async function resolveRhythmOrderId(
  admin: ReturnType<typeof createServiceClient>,
  parsed: RazorpayWebhookBody,
  razorpayOrderId: string | null,
): Promise<string | null> {
  const fromNotes =
    parsed.payload?.payment?.entity?.notes?.rhythm_order_id?.trim() ||
    parsed.payload?.order?.entity?.notes?.rhythm_order_id?.trim() ||
    null;
  if (fromNotes) return fromNotes;

  if (!razorpayOrderId) return null;

  const { data } = await admin
    .from("orders")
    .select("id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  return (data?.id as string) || null;
}

export async function POST(request: Request) {
  const razorpay = getRazorpayConfig();
  if (!razorpay.ok || !razorpay.config.webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";

  const valid = verifyWebhookSignature({
    rawBody,
    signature,
    webhookSecret: razorpay.config.webhookSecret,
  });
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 },
    );
  }

  let parsed: RazorpayWebhookBody;
  try {
    parsed = JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = parsed.event || "unknown";
  const payment = parsed.payload?.payment?.entity;
  const orderEntity = parsed.payload?.order?.entity;

  const razorpayPaymentId = payment?.id || null;
  const razorpayOrderId = payment?.order_id || orderEntity?.id || null;

  const headerEventId = request.headers.get("x-razorpay-event-id");
  const eventId =
    headerEventId?.trim() ||
    `${eventType}:${razorpayPaymentId || razorpayOrderId || "unknown"}`;

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, {
      status: 503,
    });
  }

  const wantsFulfill = shouldFulfillRazorpayEvent(eventType, payment?.status);

  // Capture-only: ignore authorized-only / non-capture payment noise
  if (
    eventType === "payment.authorized" ||
    (payment?.status &&
      !isCapturedPaymentStatus(payment.status) &&
      eventType.startsWith("payment.") &&
      eventType !== "payment.captured")
  ) {
    const recorded = await upsertPaymentEventReceived(admin, {
      eventId,
      eventType,
      razorpayOrderId,
      razorpayPaymentId,
      orderId: null,
      payload: {
        event: eventType,
        status: payment?.status ?? null,
        ignored: "not_captured",
      },
    });
    if (recorded.ok) {
      await markPaymentEventProcessed(admin, eventId);
    }
    return NextResponse.json({ ok: true, ignored: true, reason: "not_captured" });
  }

  const orderId = await resolveRhythmOrderId(admin, parsed, razorpayOrderId);

  if (wantsFulfill && !orderId) {
    // Retryable: create-order may not have linked razorpay_order_id yet.
    return NextResponse.json(
      {
        ok: false,
        error: "Order not resolved yet",
        code: "ORDER_NOT_READY",
      },
      { status: 500 },
    );
  }

  if (wantsFulfill && !razorpayPaymentId) {
    return NextResponse.json(
      { ok: false, error: "Missing payment id for capture event" },
      { status: 400 },
    );
  }

  const recorded = await upsertPaymentEventReceived(admin, {
    eventId,
    eventType,
    razorpayOrderId,
    razorpayPaymentId,
    orderId,
    payload: {
      event: eventType,
      payment_id: razorpayPaymentId,
      order_id: razorpayOrderId,
      status: payment?.status || orderEntity?.status || null,
      amount: payment?.amount ?? orderEntity?.amount ?? null,
    },
  });

  if (!recorded.ok) {
    return NextResponse.json({ ok: false, error: recorded.error }, { status: 500 });
  }

  // Already fully processed — acknowledge (fulfillment previously succeeded).
  if (
    !paymentEventNeedsFulfillment(recorded.event.processing_status) &&
    recorded.event.processing_status === "processed"
  ) {
    return NextResponse.json({ ok: true, duplicate: true, processed: true });
  }

  if (!wantsFulfill) {
    await markPaymentEventProcessed(admin, eventId, orderId);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, amount_paise, razorpay_order_id, currency")
    .eq("id", orderId!)
    .maybeSingle();

  if (!order) {
    await markPaymentEventFailed(admin, eventId, "Order row missing");
    return NextResponse.json(
      { ok: false, error: "Order not found", code: "ORDER_NOT_READY" },
      { status: 500 },
    );
  }

  if (
    typeof payment?.amount === "number" &&
    payment.amount !== order.amount_paise
  ) {
    await markPaymentEventFailed(admin, eventId, "Amount mismatch");
    return NextResponse.json({ ok: false, error: "Amount mismatch" }, {
      status: 400,
    });
  }

  if (payment?.currency && payment.currency.toUpperCase() !== "INR") {
    await markPaymentEventFailed(admin, eventId, "Currency mismatch");
    return NextResponse.json({ ok: false, error: "Currency mismatch" }, {
      status: 400,
    });
  }

  // Prefer captured confirmation from payload when present
  if (payment?.status && !isCapturedPaymentStatus(payment.status)) {
    await markPaymentEventProcessed(admin, eventId, orderId);
    return NextResponse.json({ ok: true, ignored: true, reason: "not_captured" });
  }

  const fulfilled = await fulfillPaidOrder(admin, {
    orderId: order.id as string,
    razorpayPaymentId: razorpayPaymentId!,
    expectedRazorpayOrderId: order.razorpay_order_id || razorpayOrderId || undefined,
    expectedAmountPaise: order.amount_paise as number,
  });

  if (!fulfilled.ok) {
    await markPaymentEventFailed(admin, eventId, fulfilled.error);
    return NextResponse.json({ ok: false, error: fulfilled.error }, {
      status: 500,
    });
  }

  await markPaymentEventProcessed(admin, eventId, order.id as string);

  return NextResponse.json({
    ok: true,
    fulfilled: true,
    alreadyPaid: fulfilled.alreadyPaid,
    entitlementCount: fulfilled.entitlementCount,
  });
}
