/**
 * Idempotent paid-order fulfillment via DB RPC + retry-safe payment event state.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type FulfillResult =
  | { ok: true; alreadyPaid: boolean; entitlementCount: number }
  | { ok: false; error: string };

export type PaymentEventRow = {
  id: string;
  event_id: string;
  processing_status: "received" | "processed" | "failed";
  order_id: string | null;
};

/** Only captured payments unlock digital goods. */
export function isCapturedPaymentStatus(status: string | null | undefined): boolean {
  return (status || "").toLowerCase() === "captured";
}

export function shouldFulfillRazorpayEvent(
  eventType: string,
  paymentStatus?: string | null,
): boolean {
  if (eventType === "payment.captured") return true;
  if (eventType === "order.paid") return true;
  // Never treat authorized-only as paid.
  if (eventType === "payment.authorized") return false;
  if (paymentStatus && isCapturedPaymentStatus(paymentStatus)) {
    return eventType.startsWith("payment.");
  }
  return false;
}

/**
 * Mark order paid + upsert entitlements in one DB transaction (RPC).
 * Safe to retry; backfills entitlements if order already paid.
 */
export async function fulfillPaidOrder(
  admin: SupabaseClient,
  params: {
    orderId: string;
    razorpayPaymentId: string;
    expectedRazorpayOrderId?: string;
    expectedAmountPaise?: number;
  },
): Promise<FulfillResult> {
  const { data, error } = await admin.rpc("fulfill_paid_order", {
    p_order_id: params.orderId,
    p_razorpay_payment_id: params.razorpayPaymentId,
    p_expected_razorpay_order_id: params.expectedRazorpayOrderId ?? null,
    p_expected_amount_paise: params.expectedAmountPaise ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const result = data as {
    ok?: boolean;
    error?: string;
    alreadyPaid?: boolean;
    entitlementCount?: number;
  } | null;

  if (!result || result.ok !== true) {
    return { ok: false, error: result?.error || "Fulfill RPC failed" };
  }

  return {
    ok: true,
    alreadyPaid: Boolean(result.alreadyPaid),
    entitlementCount: Number(result.entitlementCount) || 0,
  };
}

/**
 * Insert or load payment event. Does not skip fulfillment when status is
 * received/failed — callers must still attempt fulfill and mark processed.
 */
export async function upsertPaymentEventReceived(
  admin: SupabaseClient,
  params: {
    eventId: string;
    eventType: string;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    orderId?: string | null;
    payload: Record<string, unknown>;
  },
): Promise<
  | { ok: true; event: PaymentEventRow; created: boolean }
  | { ok: false; error: string }
> {
  const { data: inserted, error: insertErr } = await admin
    .from("payment_events")
    .insert({
      provider: "razorpay",
      event_id: params.eventId,
      event_type: params.eventType,
      processing_status: "received",
      razorpay_order_id: params.razorpayOrderId ?? null,
      razorpay_payment_id: params.razorpayPaymentId ?? null,
      order_id: params.orderId ?? null,
      payload: params.payload,
    })
    .select("id, event_id, processing_status, order_id")
    .maybeSingle();

  if (!insertErr && inserted) {
    return {
      ok: true,
      created: true,
      event: inserted as PaymentEventRow,
    };
  }

  if (insertErr && insertErr.code !== "23505") {
    return { ok: false, error: insertErr.message };
  }

  const { data: existing, error: loadErr } = await admin
    .from("payment_events")
    .select("id, event_id, processing_status, order_id")
    .eq("provider", "razorpay")
    .eq("event_id", params.eventId)
    .maybeSingle();

  if (loadErr || !existing) {
    return {
      ok: false,
      error: loadErr?.message || "Could not load payment event after conflict",
    };
  }

  // Refresh order_id if we learned it later
  if (params.orderId && !existing.order_id) {
    await admin
      .from("payment_events")
      .update({ order_id: params.orderId })
      .eq("id", existing.id);
    existing.order_id = params.orderId;
  }

  return {
    ok: true,
    created: false,
    event: existing as PaymentEventRow,
  };
}

export async function markPaymentEventProcessed(
  admin: SupabaseClient,
  eventId: string,
  orderId?: string | null,
): Promise<void> {
  await admin
    .from("payment_events")
    .update({
      processing_status: "processed",
      processing_error: null,
      processed_at: new Date().toISOString(),
      ...(orderId ? { order_id: orderId } : {}),
    })
    .eq("provider", "razorpay")
    .eq("event_id", eventId);
}

export async function markPaymentEventFailed(
  admin: SupabaseClient,
  eventId: string,
  errorMessage: string,
): Promise<void> {
  await admin
    .from("payment_events")
    .update({
      processing_status: "failed",
      processing_error: errorMessage.slice(0, 500),
    })
    .eq("provider", "razorpay")
    .eq("event_id", eventId);
}

/**
 * Pure helper for tests: decide whether a recorded event still needs fulfill work.
 */
export function paymentEventNeedsFulfillment(
  status: PaymentEventRow["processing_status"],
): boolean {
  return status === "received" || status === "failed";
}
