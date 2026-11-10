import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildTrustedLine,
  CHECKOUT_PRICE_MISMATCH_MESSAGE,
  checkoutDisplayMatchesOrderPaise,
  gateRazorpayCheckoutOpen,
  inrToPaise,
  MAX_LINE_QUANTITY,
  parseCheckoutLines,
  parseRelationshipCustomPriceInr,
  resolveAddOnInrMajor,
  resolveCheckoutAddOnPricing,
  resolveInrMajorFromPricing,
  sumPaise,
  validateQuantity,
} from "../pricing";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../razorpay";
import {
  isCapturedPaymentStatus,
  paymentEventNeedsFulfillment,
  shouldFulfillRazorpayEvent,
} from "../fulfill";
import {
  getCheckoutInrQuote,
  getCheckoutLineQuantity,
  getCheckoutLineTotalInr,
  sumCheckoutInr,
} from "@/lib/cartPricing";
import type { CartItem } from "@/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../");

describe("trusted pricing", () => {
  it("reads INR from CMS pricing and multiplies quantity", () => {
    assert.equal(
      resolveInrMajorFromPricing({
        INR: { regularPrice: 499, currentPrice: 299 },
      }),
      299,
    );
    assert.equal(inrToPaise(299), 29900);
    const line = buildTrustedLine({
      productId: "p1",
      productName: "Demo",
      pricing: { INR: { regularPrice: 499, currentPrice: 299 } },
      status: "active",
      quantity: 3,
    });
    assert.ok(!("error" in line));
    if (!("error" in line)) {
      assert.equal(line.unitAmountPaise, 29900);
      assert.equal(line.quantity, 3);
      assert.equal(line.lineAmountPaise, 89700);
    }
    assert.equal(
      sumPaise([
        {
          productId: "a",
          productName: "A",
          unitAmountPaise: 10000,
          quantity: 2,
          lineAmountPaise: 20000,
          currency: "INR",
          parentProductId: null,
        },
      ]),
      20000,
    );
  });

  it("rejects inactive products, bad qty, and missing prices", () => {
    assert.ok(
      "error" in
        buildTrustedLine({
          productId: "p1",
          productName: "x",
          pricing: { INR: { currentPrice: 100 } },
          status: "draft",
          quantity: 1,
        }),
    );
    assert.ok(
      "error" in
        buildTrustedLine({
          productId: "p1",
          productName: "x",
          pricing: {},
          status: "active",
          quantity: 1,
        }),
    );
    assert.ok(
      "error" in
        buildTrustedLine({
          productId: "p1",
          productName: "x",
          pricing: { INR: { currentPrice: 100 } },
          status: "active",
          quantity: 0,
        }),
    );
  });
});

describe("checkout line parsing + quantity", () => {
  it("accepts quantity > 1 and merges duplicate lines", () => {
    const parsed = parseCheckoutLines({
      items: [
        { productId: "a", quantity: 2 },
        { productId: "a", quantity: 3 },
      ],
    });
    assert.ok(!("error" in parsed));
    if (!("error" in parsed)) {
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].quantity, 5);
    }
  });

  it("rejects invalid quantities and client price tampering", () => {
    const badZero = validateQuantity(0);
    const badFloat = validateQuantity(1.5);
    const badMax = validateQuantity(MAX_LINE_QUANTITY + 1);
    assert.equal(typeof badZero, "object");
    assert.equal(typeof badFloat, "object");
    assert.equal(typeof badMax, "object");
    assert.equal(validateQuantity(1), 1);

    assert.ok(
      "error" in
        parseCheckoutLines({
          items: [{ productId: "a", quantity: 1 }],
          amountPaise: 100,
        }),
    );
    assert.ok(
      "error" in
        parseCheckoutLines({
          items: [{ productId: "a", quantity: 1, customPriceInr: 1 }],
        }),
    );
    assert.ok(
      "error" in
        parseCheckoutLines({
          items: [{ productId: "a", quantity: 0 }],
        }),
    );
  });

  it("keeps add-on lines distinct by parentProductId", () => {
    const parsed = parseCheckoutLines({
      items: [
        { productId: "addon", quantity: 1, parentProductId: "main" },
        { productId: "addon", quantity: 1 },
      ],
    });
    assert.ok(!("error" in parsed));
    if (!("error" in parsed)) {
      assert.equal(parsed.length, 2);
    }
  });
});

describe("add-on pricing consistency", () => {
  it("uses relationship custom INR when present, else list price", () => {
    assert.equal(
      resolveAddOnInrMajor({
        listPriceMajor: 199,
        relationshipCustomPriceInr: 149,
      }),
      149,
    );
    assert.equal(
      resolveAddOnInrMajor({
        listPriceMajor: 199,
        relationshipCustomPriceInr: null,
      }),
      199,
    );

    const withCustom = buildTrustedLine({
      productId: "addon",
      productName: "Add-on",
      pricing: { INR: { currentPrice: 199 } },
      status: "active",
      quantity: 2,
      parentProductId: "main",
      addOnCustomPriceInr: 149,
    });
    assert.ok(!("error" in withCustom));
    if (!("error" in withCustom)) {
      assert.equal(withCustom.unitAmountPaise, 14900);
      assert.equal(withCustom.lineAmountPaise, 29800);
    }
  });

  it("parses Postgres numeric strings and fails closed on invalid add-on prices", () => {
    const fromString = parseRelationshipCustomPriceInr("149.00");
    assert.ok(!("error" in fromString));
    if (!("error" in fromString)) {
      assert.equal(fromString.value, 149);
    }

    const fromNumber = parseRelationshipCustomPriceInr(99.5);
    assert.ok(!("error" in fromNumber));
    if (!("error" in fromNumber)) {
      assert.equal(fromNumber.value, 99.5);
    }

    const absent = parseRelationshipCustomPriceInr(null);
    assert.ok(!("error" in absent));
    if (!("error" in absent)) {
      assert.equal(absent.value, null);
    }

    assert.ok("error" in parseRelationshipCustomPriceInr(0));
    assert.ok("error" in parseRelationshipCustomPriceInr(-10));
    assert.ok("error" in parseRelationshipCustomPriceInr("not-a-price"));
    assert.ok("error" in parseRelationshipCustomPriceInr(Number.NaN));
    assert.ok("error" in parseRelationshipCustomPriceInr({}));

    // String custom must parse then apply — not silently fall back to list.
    const parsed = parseRelationshipCustomPriceInr("149");
    assert.ok(!("error" in parsed));
    if (!("error" in parsed)) {
      const line = buildTrustedLine({
        productId: "addon",
        productName: "Add-on",
        pricing: { INR: { currentPrice: 199 } },
        status: "active",
        quantity: 1,
        parentProductId: "main",
        addOnCustomPriceInr: parsed.value,
      });
      assert.ok(!("error" in line));
      if (!("error" in line)) {
        assert.equal(line.unitAmountPaise, 14900);
      }
    }
  });

  it("enforces parent for DB-identified add-ons and valid relationships", () => {
    const addOnProductIds = new Set(["addon"]);
    const customByParentChild = new Map<string, unknown>([
      ["main::addon", "149"],
    ]);

    const missingParent = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: null,
      addOnProductIds,
      customByParentChild,
      parentExists: false,
      parentStatus: null,
    });
    assert.ok("error" in missingParent);
    if ("error" in missingParent) {
      assert.match(missingParent.error, /requires a valid parentProductId/);
    }

    const unknownParent = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "ghost",
      addOnProductIds,
      customByParentChild,
      parentExists: false,
      parentStatus: null,
    });
    assert.ok("error" in unknownParent);

    const inactiveParent = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "main",
      addOnProductIds,
      customByParentChild,
      parentExists: true,
      parentStatus: "draft",
    });
    assert.ok("error" in inactiveParent);

    const mismatchedParent = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "other",
      addOnProductIds,
      customByParentChild,
      parentExists: true,
      parentStatus: "active",
    });
    assert.ok("error" in mismatchedParent);

    const invalidCustom = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "main",
      addOnProductIds,
      customByParentChild: new Map([["main::addon", "nope"]]),
      parentExists: true,
      parentStatus: "active",
    });
    assert.ok("error" in invalidCustom);
    if ("error" in invalidCustom) {
      assert.match(invalidCustom.error, /Invalid add-on price/);
    }

    const zeroCustom = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "main",
      addOnProductIds,
      customByParentChild: new Map([["main::addon", 0]]),
      parentExists: true,
      parentStatus: "active",
    });
    assert.ok("error" in zeroCustom);

    const ok = resolveCheckoutAddOnPricing({
      productId: "addon",
      parentProductId: "main",
      addOnProductIds,
      customByParentChild,
      parentExists: true,
      parentStatus: "active",
    });
    assert.ok(!("error" in ok));
    if (!("error" in ok)) {
      assert.equal(ok.parentProductId, "main");
      assert.equal(ok.addOnCustomPriceInr, 149);
      const line = buildTrustedLine({
        productId: "addon",
        productName: "Add-on",
        pricing: { INR: { currentPrice: 199 } },
        status: "active",
        quantity: 2,
        parentProductId: ok.parentProductId,
        addOnCustomPriceInr: ok.addOnCustomPriceInr,
      });
      assert.ok(!("error" in line));
      if (!("error" in line)) {
        assert.equal(line.unitAmountPaise, 14900);
        assert.equal(line.lineAmountPaise, 29800);
      }
    }

    const plain = resolveCheckoutAddOnPricing({
      productId: "main",
      parentProductId: null,
      addOnProductIds,
      customByParentChild,
      parentExists: false,
      parentStatus: null,
    });
    assert.ok(!("error" in plain));

    const parentOnPlain = resolveCheckoutAddOnPricing({
      productId: "main",
      parentProductId: "other",
      addOnProductIds,
      customByParentChild,
      parentExists: true,
      parentStatus: "active",
    });
    assert.ok("error" in parentOnPlain);
  });

  it("checkout display uses parent addOnPriceOverrides, not client customPriceInr", () => {
    const catalog = {
      getProductById(id: string) {
        if (id === "main") {
          return {
            id: "main",
            addOnPriceOverrides: {
              addon: { customPriceInr: 149 },
            },
          };
        }
        if (id === "addon") {
          return {
            id: "addon",
            productType: "VIDEO",
            pricing: {
              india: { regularPrice: 199, salePrice: 199 },
              international: { regularPrice: 9, salePrice: 9 },
            },
            offer: { enabled: false, label: "", discountText: "" },
            price: 9,
          };
        }
        return undefined;
      },
      getVideoById() {
        return undefined;
      },
      getCollectionById() {
        return undefined;
      },
    };

    const addOnItem = {
      id: "line-addon",
      productId: "addon",
      title: "Add-on",
      characterName: "",
      thumbnail: "",
      type: "product",
      productType: "VIDEO",
      quantity: 2,
      parentProductId: "main",
      customPriceInr: 1, // client tamper — must be ignored
    } as CartItem;

    const quote = getCheckoutInrQuote(addOnItem, catalog as never);
    assert.equal(quote.current, 149);
    assert.equal(getCheckoutLineQuantity(addOnItem), 2);
    assert.equal(getCheckoutLineTotalInr(addOnItem, catalog as never), 298);
    assert.equal(sumCheckoutInr([addOnItem], catalog as never), 298);
  });

  it("quantity and add-on totals match server paise calculation", () => {
    const main = buildTrustedLine({
      productId: "main",
      productName: "Main",
      pricing: { INR: { currentPrice: 299 } },
      status: "active",
      quantity: 2,
    });
    const addonCustom = parseRelationshipCustomPriceInr("149");
    assert.ok(!("error" in addonCustom));
    if ("error" in addonCustom) return;

    const addon = buildTrustedLine({
      productId: "addon",
      productName: "Add-on",
      pricing: { INR: { currentPrice: 199 } },
      status: "active",
      quantity: 3,
      parentProductId: "main",
      addOnCustomPriceInr: addonCustom.value,
    });
    assert.ok(!("error" in main) && !("error" in addon));
    if ("error" in main || "error" in addon) return;

    const serverPaise = sumPaise([main, addon]);
    assert.equal(serverPaise, 29900 * 2 + 14900 * 3);

    const catalog = {
      getProductById(id: string) {
        if (id === "main") {
          return {
            id: "main",
            pricing: {
              india: { regularPrice: 299, salePrice: 299 },
              international: { regularPrice: 9, salePrice: 9 },
            },
            offer: { enabled: false, label: "", discountText: "" },
            price: 9,
            addOnPriceOverrides: { addon: { customPriceInr: 149 } },
          };
        }
        if (id === "addon") {
          return {
            id: "addon",
            productType: "VIDEO",
            pricing: {
              india: { regularPrice: 199, salePrice: 199 },
              international: { regularPrice: 5, salePrice: 5 },
            },
            offer: { enabled: false, label: "", discountText: "" },
            price: 5,
          };
        }
        return undefined;
      },
      getVideoById() {
        return undefined;
      },
      getCollectionById() {
        return undefined;
      },
    };

    const displayInr = sumCheckoutInr(
      [
        {
          id: "m",
          productId: "main",
          title: "Main",
          characterName: "",
          thumbnail: "",
          type: "product",
          quantity: 2,
        } as CartItem,
        {
          id: "a",
          productId: "addon",
          title: "Add-on",
          characterName: "",
          thumbnail: "",
          type: "product",
          productType: "VIDEO",
          quantity: 3,
          parentProductId: "main",
        } as CartItem,
      ],
      catalog as never,
    );
    assert.equal(displayInr, 299 * 2 + 149 * 3);
    assert.equal(checkoutDisplayMatchesOrderPaise(displayInr, serverPaise), true);
  });
});

describe("checkout display vs server amount gate", () => {
  it("matches displayed INR total to server amount in integer paise", () => {
    assert.equal(checkoutDisplayMatchesOrderPaise(299, 29900), true);
    assert.equal(checkoutDisplayMatchesOrderPaise(149.5, 14950), true);
    // Float major that rounds cleanly to paise
    assert.equal(checkoutDisplayMatchesOrderPaise(10.01, 1001), true);
  });

  it("gateRazorpayCheckoutOpen blocks open on mismatch using checkout message", () => {
    const blocked = gateRazorpayCheckoutOpen({
      displayedInrMajor: 299,
      serverAmountPaise: 19900,
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.message, CHECKOUT_PRICE_MISMATCH_MESSAGE);
    }

    const allowed = gateRazorpayCheckoutOpen({
      displayedInrMajor: 299,
      serverAmountPaise: 29900,
    });
    assert.equal(allowed.ok, true);

    assert.equal(
      gateRazorpayCheckoutOpen({
        displayedInrMajor: 10,
        serverAmountPaise: 10.5,
      }).ok,
      false,
    );
  });
});

describe("capture-only fulfillment gates", () => {
  it("treats only captured as paid; rejects authorized", () => {
    assert.equal(isCapturedPaymentStatus("captured"), true);
    assert.equal(isCapturedPaymentStatus("authorized"), false);
    assert.equal(shouldFulfillRazorpayEvent("payment.captured"), true);
    assert.equal(
      shouldFulfillRazorpayEvent("payment.authorized", "authorized"),
      false,
    );
  });

  it("retries fulfillment when event was received or failed, not when processed", () => {
    assert.equal(paymentEventNeedsFulfillment("received"), true);
    assert.equal(paymentEventNeedsFulfillment("failed"), true);
    assert.equal(paymentEventNeedsFulfillment("processed"), false);
  });
});

describe("Razorpay key mode guards", () => {
  it("rejects mixed test/live public vs server keys", async () => {
    const { assertRazorpayKeyModeConsistency } = await import("../razorpay");
    assert.equal(
      assertRazorpayKeyModeConsistency({
        keyId: "rzp_test_abc",
        publicKeyId: "rzp_test_abc",
      }).ok,
      true,
    );
    assert.equal(
      assertRazorpayKeyModeConsistency({
        keyId: "rzp_test_abc",
        publicKeyId: "rzp_live_abc",
      }).ok,
      false,
    );
    assert.equal(
      assertRazorpayKeyModeConsistency({
        keyId: "rzp_test_abc",
        publicKeyId: "rzp_test_other",
      }).ok,
      false,
    );
  });
});

describe("Razorpay signatures", () => {
  it("accepts valid payment signatures and rejects tampering", () => {
    const keySecret = "test_key_secret";
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    assert.equal(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
        keySecret,
      }),
      true,
    );
    assert.equal(
      verifyPaymentSignature({
        orderId,
        paymentId,
        signature: "0".repeat(signature.length),
        keySecret,
      }),
      false,
    );
  });

  it("rejects empty or incomplete payment signature inputs", () => {
    assert.equal(
      verifyPaymentSignature({
        orderId: "order_abc",
        paymentId: "pay_xyz",
        signature: "",
        keySecret: "secret",
      }),
      false,
    );
    assert.equal(
      verifyPaymentSignature({
        orderId: "",
        paymentId: "pay_xyz",
        signature: "abc",
        keySecret: "secret",
      }),
      false,
    );
  });

  it("verifies webhook signatures over the raw body", () => {
    const webhookSecret = "whsec_test_secret";
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    assert.equal(
      verifyWebhookSignature({ rawBody, signature, webhookSecret }),
      true,
    );
  });

  it("rejects invalid webhook signatures", () => {
    const webhookSecret = "whsec_test_secret";
    const rawBody = JSON.stringify({ event: "payment.captured" });
    assert.equal(
      verifyWebhookSignature({
        rawBody,
        signature: "deadbeef",
        webhookSecret,
      }),
      false,
    );
    assert.equal(
      verifyWebhookSignature({
        rawBody,
        signature: "",
        webhookSecret,
      }),
      false,
    );
  });
});

describe("Razorpay config fail-closed", () => {
  it("getRazorpayConfig fails clearly when keys are missing (no secret leakage)", async () => {
    const { getRazorpayConfig } = await import("../razorpay");
    const saved = {
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
      NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    };
    try {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const result = getRazorpayConfig();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /RAZORPAY_KEY_ID|RAZORPAY_KEY_SECRET|not configured/i);
        assert.doesNotMatch(result.error, /rzp_/);
        assert.doesNotMatch(result.error, /secret=\w+/i);
      }
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe("mocked Razorpay HTTP helpers", () => {
  it("createRazorpayOrder succeeds with a mocked Orders API response", async () => {
    const { createRazorpayOrder } = await import("../razorpay");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: "order_mock_1",
          amount: 50000,
          currency: "INR",
          receipt: "rcpt_1",
          status: "created",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;
    try {
      const result = await createRazorpayOrder({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amountPaise: 50000,
        currency: "INR",
        receipt: "rcpt_1",
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.order.id, "order_mock_1");
        assert.equal(result.order.amount, 50000);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("createRazorpayOrder fails closed on mocked provider errors", async () => {
    const { createRazorpayOrder } = await import("../razorpay");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: { description: "simulated provider failure" } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;
    try {
      const result = await createRazorpayOrder({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amountPaise: 50000,
        currency: "INR",
        receipt: "rcpt_1",
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /simulated provider failure|failed/i);
        assert.doesNotMatch(result.error, /mock_secret/);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("createRazorpayOrder rejects non-INR / tiny amounts before calling fetch", async () => {
    const { createRazorpayOrder } = await import("../razorpay");
    let called = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 500 });
    }) as typeof fetch;
    try {
      const badCurrency = await createRazorpayOrder({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amountPaise: 50000,
        currency: "USD",
        receipt: "rcpt_1",
      });
      assert.equal(badCurrency.ok, false);
      const tooSmall = await createRazorpayOrder({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        amountPaise: 50,
        currency: "INR",
        receipt: "rcpt_1",
      });
      assert.equal(tooSmall.ok, false);
      assert.equal(called, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetchRazorpayPayment maps mocked captured and failed statuses", async () => {
    const { fetchRazorpayPayment } = await import("../razorpay");
    const originalFetch = globalThis.fetch;
    const respond = (body: unknown, status = 200) => {
      globalThis.fetch = (async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;
    };
    try {
      respond({
        id: "pay_ok",
        status: "captured",
        amount: 1000,
        currency: "INR",
        order_id: "order_1",
      });
      const captured = await fetchRazorpayPayment({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        paymentId: "pay_ok",
      });
      assert.equal(captured.ok, true);
      if (captured.ok) assert.equal(captured.payment.status, "captured");

      respond({
        id: "pay_fail",
        status: "failed",
        amount: 1000,
        currency: "INR",
        order_id: "order_1",
      });
      const failed = await fetchRazorpayPayment({
        keyId: "rzp_test_mock",
        keySecret: "mock_secret",
        paymentId: "pay_fail",
      });
      assert.equal(failed.ok, true);
      if (failed.ok) {
        assert.equal(failed.payment.status, "failed");
        assert.equal(isCapturedPaymentStatus(failed.payment.status), false);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("failed and cancelled payment gates", () => {
  it("does not fulfill failed, cancelled, or authorized-only payments", () => {
    assert.equal(isCapturedPaymentStatus("failed"), false);
    assert.equal(isCapturedPaymentStatus("cancelled"), false);
    assert.equal(isCapturedPaymentStatus("created"), false);
    assert.equal(shouldFulfillRazorpayEvent("payment.failed", "failed"), false);
    assert.equal(
      shouldFulfillRazorpayEvent("payment.authorized", "authorized"),
      false,
    );
    assert.equal(shouldFulfillRazorpayEvent("payment.captured"), true);
  });

  it("duplicate webhook delivery stays retry-safe via paymentEventNeedsFulfillment", () => {
    // First delivery: received → needs fulfill. After success: processed → skip.
    assert.equal(paymentEventNeedsFulfillment("received"), true);
    assert.equal(paymentEventNeedsFulfillment("processed"), false);
    // Failed attempt can be retried safely.
    assert.equal(paymentEventNeedsFulfillment("failed"), true);
  });
});

describe("commerce routes and migration", () => {
  it("create-order uses items+qty and DB add-on parent enforcement", () => {
    const src = readFileSync(
      join(root, "src/app/api/checkout/create-order/route.ts"),
      "utf8",
    );
    assert.match(src, /parseCheckoutLines/);
    assert.match(src, /product_relationships/);
    assert.match(src, /ADD_ON/);
    assert.match(src, /resolveCheckoutAddOnPricing/);
    assert.match(src, /related_product_id/);
    assert.match(src, /quantity:\s*line\.quantity/);
    assert.doesNotMatch(src, /productIds\s*:/);
  });

  it("verify-payment requires captured status only", () => {
    const src = readFileSync(
      join(root, "src/app/api/checkout/verify-payment/route.ts"),
      "utf8",
    );
    assert.match(src, /isCapturedPaymentStatus/);
    assert.match(src, /PAYMENT_NOT_CAPTURED/);
  });

  it("verify-payment enforces ownership and order/payment matching", () => {
    const src = readFileSync(
      join(root, "src/app/api/checkout/verify-payment/route.ts"),
      "utf8",
    );
    assert.match(src, /order\.user_id !== user\.id/);
    assert.match(src, /Forbidden/);
    assert.match(src, /verifyPaymentSignature/);
    assert.match(src, /BAD_SIGNATURE|Invalid payment signature/);
    assert.match(src, /Payment order mismatch|Order mismatch/);
    assert.match(src, /Payment amount\/currency mismatch/);
    assert.match(src, /fulfillPaidOrder/);
  });

  it("create-order checks auth before Razorpay and fails closed when misconfigured", () => {
    const src = readFileSync(
      join(root, "src/app/api/checkout/create-order/route.ts"),
      "utf8",
    );
    const postIdx = src.indexOf("export async function POST");
    assert.ok(postIdx >= 0);
    const postBody = src.slice(postIdx);
    const authIdx = postBody.indexOf('code: "AUTH_REQUIRED"');
    const razorpayIdx = postBody.indexOf("getRazorpayConfig()");
    assert.ok(authIdx >= 0 && razorpayIdx > authIdx);
    assert.match(src, /status:\s*503/);
    assert.match(src, /createRazorpayOrder/);
    assert.match(src, /AUTH_MISCONFIGURED/);
  });

  it("webhook is retry-safe and capture-only", () => {
    const src = readFileSync(
      join(root, "src/app/api/webhooks/razorpay/route.ts"),
      "utf8",
    );
    assert.match(src, /paymentEventNeedsFulfillment/);
    assert.match(src, /ORDER_NOT_READY/);
    assert.match(src, /fulfill_paid_order|fulfillPaidOrder/);
    assert.match(src, /verifyWebhookSignature/);
    assert.match(src, /Invalid signature/);
    assert.match(src, /STALE_EVENT|created_at/);
  });

  it("checkout page shows qty line totals and gates Razorpay via helper", () => {
    const src = readFileSync(
      join(root, "src/app/(store)/checkout/page.tsx"),
      "utf8",
    );
    assert.match(src, /quantity:/);
    assert.match(src, /parentProductId/);
    assert.match(src, /getCheckoutLineTotalInr/);
    assert.match(src, /getCheckoutLineQuantity/);
    assert.match(src, /gateRazorpayCheckoutOpen/);
    assert.match(src, /amount:\s*amountPaise/);
    assert.doesNotMatch(src, /Place order \(demo\)/);
    assert.doesNotMatch(src, /productIds:/);
  });

  it("download remains auth + entitlement gated", () => {
    const route = readFileSync(
      join(root, "src/app/api/library/download/route.ts"),
      "utf8",
    );
    const helper = readFileSync(
      join(root, "src/lib/commerce/download.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(root, "src/lib/commerce/clientMasterDownload.ts"),
      "utf8",
    );
    const libraryPage = readFileSync(
      join(root, "src/app/(store)/library/[productId]/page.tsx"),
      "utf8",
    );
    assert.match(route, /getUser/);
    assert.match(route, /createEntitledMasterDownload/);
    assert.match(helper, /userHasEntitlement|ENTITLEMENT_REQUIRED/);
    assert.match(helper, /createSignedUrl/);
    assert.match(helper, /download:\s*fileName/);
    assert.match(helper, /sanitizeDownloadFileName/);
    assert.match(client, /startAttachmentDownload/);
    assert.doesNotMatch(client, /window\.open/);
    assert.doesNotMatch(client, /\.target\s*=/);
    assert.doesNotMatch(libraryPage, /window\.open/);
    assert.match(client, /a\.download\s*=/);
  });

  it("sanitizeDownloadFileName is filesystem-safe and ends with .mp4", async () => {
    const { sanitizeDownloadFileName } = await import("../download");
    assert.equal(sanitizeDownloadFileName("Neon Dance!!"), "Neon-Dance.mp4");
    assert.equal(
      sanitizeDownloadFileName("../../etc/passwd"),
      "etc-passwd.mp4",
    );
    assert.equal(sanitizeDownloadFileName("clip.mp4"), "clip.mp4");
    assert.ok(sanitizeDownloadFileName("").endsWith(".mp4"));
    assert.doesNotMatch(sanitizeDownloadFileName("A / B \\ C"), /[\\/]/);
  });

  it("account purchases API reads entitlements for the signed-in user", () => {
    const route = readFileSync(
      join(root, "src/app/api/account/purchases/route.ts"),
      "utf8",
    );
    assert.match(route, /getUser/);
    assert.match(route, /from\("entitlements"\)/);
    assert.match(route, /AUTH_REQUIRED/);
    assert.match(route, /catalog_products/);
    assert.doesNotMatch(route, /localStorage|addPurchasesFromCart/);
  });

  it("purchase context loads from account purchases API after verify", () => {
    const ctx = readFileSync(
      join(root, "src/context/PurchaseContext.tsx"),
      "utf8",
    );
    const checkout = readFileSync(
      join(root, "src/app/(store)/checkout/page.tsx"),
      "utf8",
    );
    assert.match(ctx, /\/api\/account\/purchases/);
    assert.match(ctx, /refreshPurchases/);
    assert.match(ctx, /onAuthStateChange/);
    assert.match(ctx, /SIGNED_OUT/);
    assert.doesNotMatch(ctx, /rhythm-purchases-v1/);
    assert.match(checkout, /refreshPurchases/);
    assert.match(checkout, /verify-payment/);
    assert.doesNotMatch(checkout, /addPurchasesFromCart/);
  });

  it("mapEntitlementsToPurchases builds library cards from catalog rows", async () => {
    const { mapEntitlementsToPurchases } = await import("../purchases");
    const items = mapEntitlementsToPurchases(
      [
        {
          id: "ent-1",
          product_id: "vid-001",
          created_at: "2026-11-05T10:00:00.000Z",
        },
        {
          id: "ent-2",
          product_id: "col-001",
          created_at: "2026-11-05T11:00:00.000Z",
        },
        {
          id: "ent-3",
          product_id: "img-001",
          created_at: "2026-11-05T11:30:00.000Z",
        },
      ],
      [
        {
          id: "vid-001",
          name: "Neon Dance",
          character_name: "Ava",
          product_type: "VIDEO",
          media: { thumbnail: "https://example.com/t.jpg" },
        },
        {
          id: "col-001",
          name: "Pack",
          character_name: null,
          product_type: "COLLECTION",
          media: null,
        },
        {
          id: "img-001",
          name: "Still",
          character_name: "Ava",
          product_type: "AI_IMAGE",
          media: { thumbnail: "https://example.com/i.jpg" },
        },
      ],
    );
    assert.equal(items.length, 3);
    assert.equal(items[0]?.productType, "VIDEO");
    assert.equal(items[0]?.type, "video");
    assert.equal(items[1]?.productType, "COLLECTION");
    assert.equal(items[1]?.type, "collection");
    assert.equal(items[2]?.productType, "AI_IMAGE");
    assert.equal(items[2]?.type, "product");
  });

  it("orphan entitlement (missing catalog row) does not map as video", async () => {
    const { mapEntitlementsToPurchases } = await import("../purchases");
    const items = mapEntitlementsToPurchases(
      [
        {
          id: "ent-orphan",
          product_id: "missing-product-id",
          created_at: "2026-11-05T12:00:00.000Z",
        },
      ],
      [],
    );
    assert.equal(items.length, 1);
    assert.equal(items[0]?.productId, "missing-product-id");
    assert.equal(items[0]?.productType, "PRODUCT");
    assert.equal(items[0]?.type, "product");
    assert.notEqual(items[0]?.type, "video");
    assert.notEqual(items[0]?.productType, "VIDEO");
  });

  it("commerce migration still has fulfill RPC + processing_status", () => {
    const mig = readFileSync(
      join(
        root,
        "supabase/migrations/20261028000000_commerce_orders_entitlements.sql",
      ),
      "utf8",
    );
    assert.match(mig, /fulfill_paid_order/);
    assert.match(mig, /processing_status/);
  });
});
