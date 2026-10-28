/**
 * Razorpay helpers (Orders API + signature verification).
 * Secrets stay server-only; never log key/webhook secrets or full payloads with PII dumps.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
};

export function getRazorpayConfig():
  | { ok: true; config: RazorpayConfig }
  | { ok: false; error: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
  if (!keyId || !keySecret) {
    return {
      ok: false,
      error: "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)",
    };
  }
  return {
    ok: true,
    config: { keyId, keySecret, webhookSecret },
  };
}

export function getPublicRazorpayKeyId(): string | null {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    null
  );
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Checkout return signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(rawBody, webhook_secret) hex. */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signature, webhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

export type CreatedRazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
};

export async function createRazorpayOrder(params: {
  keyId: string;
  keySecret: string;
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<
  { ok: true; order: CreatedRazorpayOrder } | { ok: false; error: string }
> {
  const auth = Buffer.from(
    `${params.keyId}:${params.keySecret}`,
  ).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt.slice(0, 40),
      payment_capture: 1,
      notes: params.notes ?? {},
    }),
  });

  const json = (await res.json().catch(() => null)) as
    | CreatedRazorpayOrder & { error?: { description?: string } }
    | null;

  if (!res.ok || !json?.id) {
    const msg =
      json && "error" in json && json.error?.description
        ? json.error.description
        : `Razorpay order create failed (${res.status})`;
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    order: {
      id: json.id,
      amount: json.amount,
      currency: json.currency,
      receipt: json.receipt ?? null,
      status: json.status,
    },
  };
}

export async function fetchRazorpayPayment(params: {
  keyId: string;
  keySecret: string;
  paymentId: string;
}): Promise<
  | {
      ok: true;
      payment: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        order_id: string;
      };
    }
  | { ok: false; error: string }
> {
  const auth = Buffer.from(
    `${params.keyId}:${params.keySecret}`,
  ).toString("base64");

  const res = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}`,
    {
      headers: { Authorization: `Basic ${auth}` },
    },
  );

  const json = (await res.json().catch(() => null)) as {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    order_id?: string;
    error?: { description?: string };
  } | null;

  if (!res.ok || !json?.id) {
    return {
      ok: false,
      error:
        json?.error?.description ||
        `Razorpay payment fetch failed (${res.status})`,
    };
  }

  return {
    ok: true,
    payment: {
      id: json.id,
      status: json.status || "",
      amount: Number(json.amount) || 0,
      currency: json.currency || "",
      order_id: json.order_id || "",
    },
  };
}
