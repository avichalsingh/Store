/**
 * Server-trusted product pricing for checkout (never trust client amounts).
 */

export type CheckoutCurrency = "INR";

export type CheckoutLineInput = {
  productId: string;
  quantity: number;
  /** When set, line is an add-on of this parent product (for relationship pricing). */
  parentProductId?: string | null;
};

export type TrustedProductPrice = {
  productId: string;
  productName: string;
  unitAmountPaise: number;
  quantity: number;
  lineAmountPaise: number;
  currency: CheckoutCurrency;
  parentProductId: string | null;
};

type PricingTier = {
  INR?: { regularPrice?: number; currentPrice?: number; salePrice?: number };
  USD?: { regularPrice?: number; currentPrice?: number; salePrice?: number };
  india?: { regularPrice?: number; salePrice?: number };
  international?: { regularPrice?: number; salePrice?: number };
};

export const MAX_CHECKOUT_LINES = 20;
export const MAX_LINE_QUANTITY = 20;

/** Convert major INR units to integer paise (Razorpay amount). */
export function inrToPaise(amountMajor: number): number {
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) return 0;
  return Math.round(amountMajor * 100);
}

/**
 * Compare checkout UI INR major total to server order amount in integer paise.
 * Avoids float equality by rounding the display total to paise first.
 */
export function checkoutDisplayMatchesOrderPaise(
  displayedInrMajor: number,
  orderAmountPaise: unknown,
): boolean {
  if (!Number.isFinite(displayedInrMajor) || displayedInrMajor <= 0) {
    return false;
  }
  if (typeof orderAmountPaise !== "number" || !Number.isInteger(orderAmountPaise)) {
    return false;
  }
  if (orderAmountPaise < 100) return false;
  return inrToPaise(displayedInrMajor) === orderAmountPaise;
}

export const CHECKOUT_PRICE_MISMATCH_MESSAGE =
  "Prices have changed since you added these items. Refresh your cart and try again.";

/**
 * Parse product_relationships.custom_price_inr from PostgREST
 * (number, numeric string, or null).
 * - null / undefined / blank → no override (use list price)
 * - present but not a finite amount > 0 → error (fail closed; never fall back)
 */
export function parseRelationshipCustomPriceInr(
  raw: unknown,
): { value: number | null } | { error: string } {
  if (raw == null) return { value: null };
  if (typeof raw === "string" && raw.trim() === "") return { value: null };

  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else if (typeof raw === "string") {
    n = Number(raw.trim());
  } else {
    return { error: "custom_price_inr must be numeric" };
  }

  if (!Number.isFinite(n)) {
    return { error: "custom_price_inr is not a finite number" };
  }
  if (n <= 0) {
    return { error: "custom_price_inr must be > 0" };
  }
  return { value: n };
}

/**
 * Resolve chargeable INR amount from CMS pricing JSON.
 * Supports Admin INR.currentPrice and storefront india.salePrice shapes.
 */
export function resolveInrMajorFromPricing(
  pricing: unknown,
): number | null {
  if (!pricing || typeof pricing !== "object") return null;
  const p = pricing as PricingTier;

  const inrCurrent = p.INR?.currentPrice;
  const inrRegular = p.INR?.regularPrice;
  if (typeof inrCurrent === "number" && inrCurrent > 0) return inrCurrent;
  if (typeof inrRegular === "number" && inrRegular > 0) return inrRegular;

  const indiaSale = p.india?.salePrice;
  const indiaRegular = p.india?.regularPrice;
  if (typeof indiaSale === "number" && indiaSale > 0) return indiaSale;
  if (typeof indiaRegular === "number" && indiaRegular > 0) return indiaRegular;

  return null;
}

/**
 * Trusted add-on unit price from an already-validated custom major (or null → list).
 * Callers must parse DB numerics via parseRelationshipCustomPriceInr first.
 */
export function resolveAddOnInrMajor(params: {
  listPriceMajor: number | null;
  relationshipCustomPriceInr: number | null | undefined;
}): number | null {
  const custom = params.relationshipCustomPriceInr;
  if (typeof custom === "number" && Number.isFinite(custom) && custom > 0) {
    return custom;
  }
  return params.listPriceMajor;
}

/**
 * Enforce add-on parent using trusted DB relationship data (not client hints alone).
 * `addOnProductIds` = related_product_id values from ADD_ON rows for cart products.
 * `customByParentChild` keys = `${parentId}::${childId}` → raw custom_price_inr.
 */
export function resolveCheckoutAddOnPricing(params: {
  productId: string;
  parentProductId: string | null | undefined;
  addOnProductIds: ReadonlySet<string>;
  customByParentChild: ReadonlyMap<string, unknown>;
  parentExists: boolean;
  parentStatus: string | null | undefined;
}):
  | {
      parentProductId: string | null;
      addOnCustomPriceInr: number | null;
    }
  | { error: string } {
  const isAddOnProduct = params.addOnProductIds.has(params.productId);
  const parentId =
    typeof params.parentProductId === "string" && params.parentProductId.trim()
      ? params.parentProductId.trim()
      : null;

  if (!isAddOnProduct) {
    if (parentId) {
      return {
        error: `Product ${params.productId} is not sold as an add-on; parentProductId is not allowed`,
      };
    }
    return { parentProductId: null, addOnCustomPriceInr: null };
  }

  if (!parentId) {
    return {
      error: `Add-on product ${params.productId} requires a valid parentProductId`,
    };
  }

  if (!params.parentExists) {
    return { error: `Unknown parent product ${parentId}` };
  }

  if (params.parentStatus !== "active") {
    return {
      error: `Parent product ${parentId} is not available for purchase`,
    };
  }

  const key = `${parentId}::${params.productId}`;
  if (!params.customByParentChild.has(key)) {
    return {
      error: `No ADD_ON relationship from ${parentId} to ${params.productId}`,
    };
  }

  const parsed = parseRelationshipCustomPriceInr(
    params.customByParentChild.get(key),
  );
  if ("error" in parsed) {
    return {
      error: `Invalid add-on price for ${params.productId}: ${parsed.error}`,
    };
  }

  return {
    parentProductId: parentId,
    addOnCustomPriceInr: parsed.value,
  };
}

/**
 * Gate used by checkout before Razorpay.open — keeps display/server paise in sync.
 */
export function gateRazorpayCheckoutOpen(params: {
  displayedInrMajor: number;
  serverAmountPaise: unknown;
}): { ok: true } | { ok: false; message: string } {
  if (
    !checkoutDisplayMatchesOrderPaise(
      params.displayedInrMajor,
      params.serverAmountPaise,
    )
  ) {
    return { ok: false, message: CHECKOUT_PRICE_MISMATCH_MESSAGE };
  }
  return { ok: true };
}

export function validateQuantity(raw: unknown): number | { error: string } {
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { error: "quantity must be an integer" };
  }
  if (raw < 1) {
    return { error: "quantity must be >= 1" };
  }
  if (raw > MAX_LINE_QUANTITY) {
    return { error: `quantity must be <= ${MAX_LINE_QUANTITY}` };
  }
  return raw;
}

/**
 * Parse checkout body lines. Ignores any client price/total fields.
 * Merges duplicate (parentProductId, productId) pairs by summing quantities.
 */
export function parseCheckoutLines(
  body: unknown,
): CheckoutLineInput[] | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid body" };
  }
  const obj = body as Record<string, unknown>;

  // Reject explicit client amount tampering fields if present at top level
  for (const key of [
    "amount",
    "amountPaise",
    "total",
    "price",
    "unitPrice",
    "customPriceInr",
  ]) {
    if (key in obj && obj[key] != null) {
      return { error: "Client prices are not accepted" };
    }
  }

  const rawItems = obj.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "items required" };
  }
  if (rawItems.length > MAX_CHECKOUT_LINES) {
    return { error: `At most ${MAX_CHECKOUT_LINES} line items` };
  }

  const merged = new Map<string, CheckoutLineInput>();

  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      return { error: "Invalid line item" };
    }
    const line = entry as Record<string, unknown>;
    for (const key of [
      "amount",
      "amountPaise",
      "price",
      "unitPrice",
      "customPriceInr",
      "total",
    ]) {
      if (key in line && line[key] != null) {
        return { error: "Client prices are not accepted" };
      }
    }

    const productId =
      typeof line.productId === "string" ? line.productId.trim() : "";
    if (!productId) {
      return { error: "productId required on each line" };
    }

    const parentRaw = line.parentProductId;
    const parentProductId =
      typeof parentRaw === "string" && parentRaw.trim()
        ? parentRaw.trim()
        : null;

    if (parentProductId && parentProductId === productId) {
      return { error: "Add-on cannot reference itself as parent" };
    }

    const qtyResult = validateQuantity(line.quantity ?? 1);
    if (typeof qtyResult === "object") {
      return qtyResult;
    }

    const key = `${parentProductId ?? ""}::${productId}`;
    const existing = merged.get(key);
    if (existing) {
      const nextQty = existing.quantity + qtyResult;
      if (nextQty > MAX_LINE_QUANTITY) {
        return {
          error: `Combined quantity for ${productId} exceeds ${MAX_LINE_QUANTITY}`,
        };
      }
      existing.quantity = nextQty;
    } else {
      merged.set(key, {
        productId,
        quantity: qtyResult,
        parentProductId,
      });
    }
  }

  if (merged.size > MAX_CHECKOUT_LINES) {
    return { error: `At most ${MAX_CHECKOUT_LINES} line items` };
  }

  return [...merged.values()];
}

export function buildTrustedLine(params: {
  productId: string;
  productName: string;
  pricing: unknown;
  status: string | null | undefined;
  quantity: number;
  parentProductId?: string | null;
  /** When add-on: trusted INR major from relationship or null to use list price */
  addOnCustomPriceInr?: number | null;
}): TrustedProductPrice | { error: string } {
  if (params.status !== "active") {
    return { error: `Product ${params.productId} is not available for purchase` };
  }

  const listMajor = resolveInrMajorFromPricing(params.pricing);
  const isAddOn = Boolean(params.parentProductId);
  const major = isAddOn
    ? resolveAddOnInrMajor({
        listPriceMajor: listMajor,
        relationshipCustomPriceInr: params.addOnCustomPriceInr,
      })
    : listMajor;

  if (major == null) {
    return { error: `Product ${params.productId} has no valid INR price` };
  }

  const unitAmountPaise = inrToPaise(major);
  if (unitAmountPaise < 100) {
    return { error: `Product ${params.productId} price below Razorpay minimum` };
  }

  const quantity = params.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    return { error: "Invalid quantity" };
  }

  return {
    productId: params.productId,
    productName: params.productName.trim() || params.productId,
    unitAmountPaise,
    quantity,
    lineAmountPaise: unitAmountPaise * quantity,
    currency: "INR",
    parentProductId: params.parentProductId?.trim() || null,
  };
}

export function sumPaise(lines: TrustedProductPrice[]): number {
  return lines.reduce((sum, line) => sum + line.lineAmountPaise, 0);
}
