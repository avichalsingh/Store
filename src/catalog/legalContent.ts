/**
 * PRAGVI legal / policy drafts for the KYC release candidate.
 *
 * Confirmed facts (do not invent beyond these):
 * - Brand / trading name: PRAGVI
 * - Proprietor legal name: Avichal Prakash
 * - Structure: Individual, home-based
 * - Support email: support@pragvi.com
 * - Support channel: email only (phone support not offered)
 * - GST: not registered (no GSTIN)
 * - Domain intent: pragvi.com
 * - Residential address: private — not authorized for public disclosure
 * - Product licence: personal use only (no commercial / extended licence offered)
 *
 * Policy decisions applied in this draft:
 * - Strict digital-product refunds (change-of-mind declined after successful
 *   digital delivery) with preserved consumer-rights exceptions
 * - Phone support not offered; no public guaranteed support SLA
 *
 * Application audit notes (code-backed, not invented marketing claims):
 * - No third-party analytics / marketing cookie SDK configured in storefront source
 * - Digital fulfilment paths in code: entitled video masters via signed library
 *   download; entitled text/library content via authenticated library content API;
 *   bundles/collections unlock entitled component products
 *
 * Remaining unknowns stay as explicit placeholders.
 * Indian e-commerce / consumer rules continue to apply today under current law
 * (including the Consumer Protection Act, 2019). Separately note any 2026
 * amendment package whose compliance date is 1 January 2027 — do not treat
 * that future date as already in force for today’s disclosures.
 */

export type LegalDocId =
  | "privacy"
  | "terms"
  | "refunds"
  | "delivery"
  | "contact";

export type LegalDoc = {
  id: LegalDocId;
  title: string;
  eyebrow: string;
  lastUpdatedLabel: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
};

const PROPRIETOR_LEGAL_NAME = "Avichal Prakash";

const PLACEHOLDER_PUBLIC_BUSINESS_ADDRESS =
  "[PRINCIPAL BUSINESS ADDRESS / LAWFUL PUBLIC DISCLOSURE APPROACH — UNRESOLVED; RESIDENTIAL / HOME ADDRESS IS PRIVATE AND NOT AUTHORIZED FOR PUBLIC DISPLAY]";

const SUPPORT_EMAIL = "support@pragvi.com";

const SUPPORT_CHANNEL =
  "Customer support is available by email only at support@pragvi.com. Phone support is not offered.";

const PLACEHOLDER_GRIEVANCE_NAME =
  "[GRIEVANCE OFFICER NAME AND DESIGNATION — CONFIRM IF STATUTORILY REQUIRED FOR THIS BUSINESS CLASSIFICATION]";

const PLACEHOLDER_GRIEVANCE_CONTACT =
  "[GRIEVANCE CONTACT DETAILS (EMAIL / PHONE AS APPLICABLE) — CONFIRM IF STATUTORILY REQUIRED]";

const PLACEHOLDER_SUPPORT_HOURS =
  "[SUPPORT OPERATING HOURS — UNRESOLVED; NO PUBLIC RESPONSE-TIME SLA IS PROMISED]";

const PLACEHOLDER_JURISDICTION =
  "[GOVERNING JURISDICTION / FORUM IN INDIA — CONFIRM]";

const PLACEHOLDER_REFUND_PROCESSING_TIMEFRAME =
  "[REFUND PROCESSING TIMEFRAME AFTER ACCEPTANCE — CONFIRM WITHIN APPLICABLE LAW AND PAYMENT-PROVIDER RULES; DO NOT INVENT]";

const DELIVERY_BY_PRODUCT_TYPE = `Current application fulfilment (subject to entitlement after verified payment):
• Videos — entitled master access through Account / Library via short-lived signed download links.
• Images, prompts, captions, and similar library content — entitled in-account retrieval through authenticated library content APIs.
• Bundles and collections — unlock the entitled component products configured for that offering.
Previews on the storefront may be watermarked, shortened, or limited and are not the purchased master.`;

const PLACEHOLDER_RETENTION =
  "[DATA RETENTION PERIODS BY CATEGORY — UNRESOLVED; DO NOT INVENT NUMERIC SCHEDULES]";

const ANALYTICS_STATUS =
  "Storefront application source reviewed for this release does not configure a third-party analytics or marketing-cookie SDK (for example Google Analytics, Meta Pixel, Mixpanel, or similar). Necessary authentication session cookies and ordinary local interface preferences (such as theme) may still be used. If analytics vendors are added later, this policy must be updated before they are enabled.";

const PLACEHOLDER_TAX =
  "[ANY APPLICABLE TAX DISCLOSURES BEYOND THE CONFIRMED ABSENCE OF GST REGISTRATION — CONFIRM]";

const PERSONAL_LICENCE = `A standard purchase grants you a personal, non-commercial, non-exclusive, non-transferable licence to use the purchased digital file(s) for your own personal projects and ordinary personal social-media publishing.

You do not acquire copyright ownership of the underlying work merely by purchasing access or a file.

Commercial, extended, agency, resale, or redistribution licences are not offered at this time. You must not, without prior written permission: use the files for commercial client work or paid campaigns as a sold asset; resell the files; redistribute or publicly share masters; sublicense; upload the masters to asset marketplaces; or repackage the content for others as a competing product.`;

const BUSINESS_STATUS = `PRAGVI is a brand and trading name used by an individual operating a home-based digital-products business in India. PRAGVI is not described on these pages as a registered company, LLP, or other incorporated legal entity. The proprietor's legal name for formal documents is ${PROPRIETOR_LEGAL_NAME}. PRAGVI is not registered under GST; no GSTIN is displayed. Customer support email: ${SUPPORT_EMAIL}. Support channel: email only. Intended public website: pragvi.com.`;


export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    lastUpdatedLabel: "Draft — confirmed proprietor and licence; remaining statutory fields marked",
    summary:
      "This draft describes personal data PRAGVI may process when you use the website, create an account, check out, or email support. It reflects the current application architecture where known, and marks unknowns instead of inventing vendors, retention periods, or security guarantees.",
    sections: [
      {
        heading: "Who operates PRAGVI",
        body: `${BUSINESS_STATUS} Public principal-business disclosure remains: ${PLACEHOLDER_PUBLIC_BUSINESS_ADDRESS}.`,
      },
      {
        heading: "Scope",
        body: "This policy covers the PRAGVI storefront, customer accounts, checkout, purchase library, and email support. It does not cover third-party websites you may open from external links; those services have their own privacy practices.",
      },
      {
        heading: "Information we collect",
        body: `Based on the current application design, PRAGVI may process:

• Account and authentication data — typically your email address and authentication metadata handled through our authentication provider (Supabase Auth), including session cookies needed to keep you signed in.

• Order and payment-related data — order identifiers, amounts, currency, status, and Razorpay order/payment references needed to create, verify, and record purchases. Card, UPI, and similar payment instrument details are collected and processed by Razorpay on its checkout; PRAGVI does not store full card numbers on its application servers.

• Purchase and library records — which products you are entitled to access after a verified paid order, and related download or in-account access activity needed to fulfil that entitlement.

• Support communications — the content of messages you send to ${SUPPORT_EMAIL}, and any order references you include.

• Technical and security logs — such as IP address, user-agent / browser information, and request logs that hosting and application infrastructure may generate for security, debugging, and reliability.

• Preferences stored on your device — for example theme preference may be stored locally in the browser.

${ANALYTICS_STATUS}`,
      },
      {
        heading: "Why we use personal data",
        body: "We use personal data to operate accounts, show the catalogue, take and verify payments, deliver purchased digital access, prevent fraud and abuse, respond to support requests, and meet applicable legal obligations. We do not sell your personal data as a product.",
      },
      {
        heading: "Cookies and similar technologies",
        body: `The storefront uses cookies and similar storage that are necessary for signed-in sessions (authentication) and may use local browser storage for interface preferences such as theme. Admin surfaces use separate session cookies that are not part of the ordinary customer journey.

${ANALYTICS_STATUS}`,
      },
      {
        heading: "Processors and other services",
        body: "Depending on configuration, personal data may be processed by: Supabase (authentication and application database / storage); Razorpay (payment processing); and the hosting provider that serves the website. Independent third-party websites you open from external links are separate controllers of any data you submit to them.",
      },
      {
        heading: "Retention and deletion",
        body: `${PLACEHOLDER_RETENTION}

Until retention schedules are confirmed, treat the following as descriptive only: account, order, and entitlement records are kept while needed to provide the service and to handle disputes, fraud review, or legal retention duties; support emails are kept as long as needed to resolve the request. You may email ${SUPPORT_EMAIL} to request access, correction, or deletion subject to applicable law and records we must keep.`,
      },
      {
        heading: "Security",
        body: "PRAGVI transmits the website over HTTPS in normal production hosting setups and restricts administrative access. This draft does not claim specific encryption products, certifications, or absolute security. No online service is perfectly secure.",
      },
      {
        heading: "Children",
        body: "PRAGVI is intended for adults who can enter a binding contract. Do not create an account if you are not legally able to do so in your jurisdiction.",
      },
      {
        heading: "Your privacy requests",
        body: `Email ${SUPPORT_EMAIL} to ask about access, correction, deletion, or a privacy concern. We may need to verify that the request comes from the account holder. Grievance / escalation contact for privacy matters, once designated: ${PLACEHOLDER_GRIEVANCE_NAME}; ${PLACEHOLDER_GRIEVANCE_CONTACT}.`,
      },
      {
        heading: "Changes",
        body: "When this draft is finalized for production, material updates should be reflected on this page with a revised date. Continued use after an update means you should review the revised text.",
      },
    ],
  },

  terms: {
    id: "terms",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    lastUpdatedLabel: "Draft — confirmed proprietor and licence; remaining statutory fields marked",
    summary:
      "These draft terms explain how the PRAGVI website and digital catalogue work, how orders are accepted, what licence you receive by default, and your responsibilities as a customer.",
    sections: [
      {
        heading: "Agreement and who you are contracting with",
        body: `By using PRAGVI or buying a digital product, you agree to these Terms with Avichal Prakash, the individual trader operating under the brand/trading name PRAGVI. Proprietor legal name for formal documents: ${PROPRIETOR_LEGAL_NAME}. Public principal-business disclosure: ${PLACEHOLDER_PUBLIC_BUSINESS_ADDRESS}. If you do not agree, do not use the service.`,
      },
      {
        heading: "The service",
        body: "PRAGVI sells digital creative products that may include videos, images, prompts, captions, collections, and bundles. Listings and fulfilment are for PRAGVI catalogue products only in this release.",
      },
      {
        heading: "Accounts",
        body: "Some features, including checkout and the purchase library, require a signed-in account. Provide accurate information, keep your login secure, and tell us promptly at support@pragvi.com if you believe your account was used without authorisation. We may suspend accounts used for fraud, abuse, or breach of these Terms.",
      },
      {
        heading: "Product descriptions and pricing",
        body: `Catalogue pages describe products and may show reference prices. Charged checkout amounts for Razorpay orders are calculated in INR on the server from trusted catalogue pricing before a payment order is created. Displayed international reference prices, if any, are for browsing convenience and are not the charged checkout currency unless expressly stated at payment. ${PLACEHOLDER_TAX}`,
      },
      {
        heading: "Orders and payment confirmation",
        body: "Selecting checkout and paying through Razorpay is an offer to buy the selected items. An order is accepted when payment is successfully verified by PRAGVI’s systems (payment signature verification and/or verified payment webhook) and purchase entitlements are recorded for your account. Closing Checkout or a failed payment does not create entitlements.",
      },
      {
        heading: "Digital delivery",
        body: `After successful payment confirmation, entitled products are made available digitally through your signed-in Account / Library according to product type. See the Digital Product Delivery Policy. ${DELIVERY_BY_PRODUCT_TYPE}`,
      },
      {
        heading: "Licence (default: personal, non-commercial)",
        body: `${PERSONAL_LICENCE}`,
      },
      {
        heading: "Intellectual property",
        body: "PRAGVI, the website design, catalogue presentation, and digital products remain protected by applicable intellectual-property laws. Previews may be watermarked or limited. Feedback you send may be used to improve the service without obligation to you.",
      },
      {
        heading: "Customer responsibilities",
        body: "You are responsible for how you use purchased content, including compliance with the laws and platform rules of places where you publish. AI-assisted assets can contain imperfections; review outputs before publishing. Do not attempt unauthorised access, payment fraud, scraping of non-public systems, or infringement of others’ rights.",
      },
      {
        heading: "Disclaimers",
        body: "The service and digital products are provided as available. PRAGVI does not guarantee social-media reach, ranking, earnings, or uninterrupted uptime. Nothing in these Terms limits rights that cannot be limited under applicable Indian consumer law.",
      },
      {
        heading: "Liability",
        body: "To the extent permitted by law, liability of the individual trader operating PRAGVI arising from a purchase is limited to the amount you paid for that purchase. Mandatory consumer protections continue to apply.",
      },
      {
        heading: "Consumer rights and disputes",
        body: `These Terms are governed by the laws of India. Forum / jurisdiction: ${PLACEHOLDER_JURISDICTION}. You may also have rights under the Consumer Protection Act, 2019 and related rules. For support or eligible refund requests, email ${SUPPORT_EMAIL}. Statutory grievance contact, once designated: ${PLACEHOLDER_GRIEVANCE_NAME}; ${PLACEHOLDER_GRIEVANCE_CONTACT}. ${SUPPORT_CHANNEL}`,
      },
      {
        heading: "Contact",
        body: `Email: ${SUPPORT_EMAIL}. Public principal-business disclosure field: ${PLACEHOLDER_PUBLIC_BUSINESS_ADDRESS}.`,
      },
    ],
  },

  refunds: {
    id: "refunds",
    title: "Refund and Cancellation Policy",
    eyebrow: "Legal",
    lastUpdatedLabel: "Draft — confirmed proprietor and licence; remaining statutory fields marked",
    summary:
      "PRAGVI sells digital products. This draft describes a strict approach to change-of-mind requests after successful digital delivery, while preserving remedies for failed delivery, defects, and other situations protected by applicable law.",
    sections: [
      {
        heading: "Digital products",
        body: "PRAGVI catalogue products are intangible digital goods or digital access. After payment is successfully verified and entitlements are available in your Account / Library, delivery has generally occurred for refund purposes, subject to the exceptions below and to applicable law.",
      },
      {
        heading: "Cancellation before payment succeeds",
        body: "If you abandon Razorpay Checkout, or payment fails or is not verified, no purchase entitlement is created for that attempt. You may try again. No refund is needed because no successful charge tied to an entitlement should exist for that attempt.",
      },
      {
        heading: "Change of mind after successful digital delivery",
        body: "After successful digital delivery, PRAGVI does not offer refunds for change of mind, dislike of creative style, unused files, or similar preference-based reasons, subject to mandatory rights under applicable law. Preference-based refusal does not cancel the separate remedies listed below for non-delivery, defects, duplicate charges, material misdescription, unauthorised payments, or other rights that applicable law requires us to honour.",
      },
      {
        heading: "Situations where we will review a refund or remedy",
        body: `Email ${SUPPORT_EMAIL} if any of the following apply. We will investigate in good faith and may refund, re-deliver, or otherwise remedy as appropriate:

• Non-delivery — payment succeeded but entitled access did not appear in your Account / Library within a reasonable period after verification, or access remains missing after you followed the delivery instructions.

• Duplicate payment — you were charged more than once for the same successful purchase.

• Defective or corrupted files — a delivered file cannot be opened or used in a normal way for its stated format, and the defect is not caused by unsupported software or your device alone.

• Material misdescription — the delivered product differs in a material way from the core description on the product page (ordinary creative taste differences are not misdescription).

• Unauthorised payment — you report a payment you did not authorise; we may coordinate with Razorpay and relevant banks or schemes as needed.

• Other remedies required by applicable consumer law — including the Consumer Protection Act, 2019, where it applies to the transaction.`,
      },
      {
        heading: "How to request help or an eligible refund",
        body: `Send an email to ${SUPPORT_EMAIL} with: your account email; approximate purchase time; Razorpay payment id / order id if available; product name; and a short description of the problem. Do not send card numbers, UPI PINs, or OTPs.

We assess requests under this policy and applicable law. Ordinary support handling is separate from any statutory grievance process. ${PLACEHOLDER_SUPPORT_HOURS}`,
      },
      {
        heading: "If a refund is accepted",
        body: `Accepted refunds are returned through the original payment method where the payment provider allows it. ${PLACEHOLDER_REFUND_PROCESSING_TIMEFRAME}

Bank or payment-provider posting times are outside PRAGVI’s direct control.`,
      },
      {
        heading: "Chargebacks",
        body: "If you dispute a charge with your bank or Razorpay, we may share order and delivery records needed to respond. False disputes may lead to account suspension.",
      },
    ],
  },

  delivery: {
    id: "delivery",
    title: "Digital Product Delivery Policy",
    eyebrow: "Legal",
    lastUpdatedLabel: "Draft — confirmed proprietor and licence; remaining statutory fields marked",
    summary:
      "How PRAGVI delivers digital purchases after payment is successfully confirmed. There is no physical shipping for catalogue products.",
    sections: [
      {
        heading: "No physical shipment",
        body: "PRAGVI catalogue products are digital. We do not ship parcels or require a delivery address for ordinary catalogue fulfilment. This page is the delivery / shipping disclosure for digital goods.",
      },
      {
        heading: "When fulfilment starts",
        body: "Fulfilment starts after Razorpay payment is successfully verified by PRAGVI (client-side payment verification and/or a verified payment webhook) and entitlements are recorded for your signed-in user account. Unverified or failed payments do not unlock the library.",
      },
      {
        heading: "How you access purchases",
        body: `Sign in and open Account / Library.

Access depends on product type. Examples in the current architecture include: short-lived signed download links for entitled video masters; and in-account retrieval of entitled text or other library content for applicable product types. Bundles and collections unlock the entitled component products according to catalogue configuration.

${DELIVERY_BY_PRODUCT_TYPE}

PRAGVI aims for prompt digital access after successful verification, but this draft does not guarantee instant fulfilment for every product in every circumstance, and does not claim manual fulfilment where the application provides automated entitlement unlocks—or the reverse.`,
      },
      {
        heading: "Previews versus purchased files",
        body: "Storefront previews may be watermarked, shortened, compressed, or otherwise limited. Purchased access is intended to provide the entitled asset defined for that product, which may differ from the preview by design.",
      },
      {
        heading: "If access is missing or a file is defective",
        body: `Email ${SUPPORT_EMAIL} with your account email, payment/order reference, product name, and a description of the issue. We will check entitlements and may restore access or provide another remedy under the Refund and Cancellation Policy and applicable law.`,
      },
    ],
  },

  contact: {
    id: "contact",
    title: "Contact & Customer Support",
    eyebrow: "Support",
    lastUpdatedLabel: "Draft — confirmed proprietor and licence; remaining statutory fields marked",
    summary:
      "How to reach PRAGVI. The confirmed public support channel is email. Phone support is not currently offered.",
    sections: [
      {
        heading: "Customer support",
        body: `Email: ${SUPPORT_EMAIL}

${SUPPORT_CHANNEL}

Website (intended): https://pragvi.com

${PLACEHOLDER_SUPPORT_HOURS}

This page does not publish a guaranteed response-time promise for ordinary support emails. Statutory grievance acknowledgement and resolution timelines, where they apply under current Indian law, are separate from ordinary support handling. Any additional e-commerce disclosure duties that become mandatory only from 1 January 2027 under later amendments are not treated as already in force on these pages.`,
      },
      {
        heading: "Business identity",
        body: `Brand / trading name: PRAGVI
Business structure: Individual (home-based)
Proprietor's legal name: ${PROPRIETOR_LEGAL_NAME}
GST: Not registered — no GSTIN is displayed
${PLACEHOLDER_TAX}
Principal business address / lawful public disclosure: ${PLACEHOLDER_PUBLIC_BUSINESS_ADDRESS}

The residential address used for this home-based business is private and is not authorized for publication on this website.`,
      },
      {
        heading: "Grievance redressal",
        body: `Day-to-day customer support is email-only (${SUPPORT_EMAIL}).

Where a designated grievance officer or additional customer-care disclosure is required for this business classification under current Indian law, the following fields will be completed rather than invented:

Name and designation: ${PLACEHOLDER_GRIEVANCE_NAME}
Contact: ${PLACEHOLDER_GRIEVANCE_CONTACT}

Using email as the primary day-to-day support channel does not by itself remove any legally required customer-care or grievance disclosures once those details are confirmed. Future e-commerce amendment obligations effective only from 1 January 2027 are tracked separately and are not presented as already binding here.`,
      },
      {
        heading: "Order help checklist",
        body: "Include your account email, approximate purchase time, Razorpay payment or order id if available, and the product name. Do not send card numbers, UPI PINs, or OTPs.",
      },
      {
        heading: "Related policies",
        body: "Privacy Policy, Terms & Conditions, Refund and Cancellation Policy, and Digital Product Delivery Policy are linked in the website footer and in the legal navigation on each policy page.",
      },
    ],
  },
};

export const LEGAL_NAV: Array<{ id: LegalDocId; href: string; label: string }> =
  [
    { id: "privacy", href: "/privacy", label: "Privacy Policy" },
    { id: "terms", href: "/terms", label: "Terms & Conditions" },
    { id: "refunds", href: "/refunds", label: "Refunds & Cancellation" },
    { id: "delivery", href: "/delivery", label: "Digital Delivery" },
    { id: "contact", href: "/contact", label: "Contact & Support" },
  ];

/** Explicit unresolved items — do not delete to make pages look finished. */
export const LEGAL_MISSING_BUSINESS_DETAILS = [
  "Principal business address / lawful public disclosure approach (residential address stays private)",
  "Grievance officer name and designation (if statutorily required)",
  "Grievance contact details (if statutorily required)",
  "Support operating hours (optional; no SLA promised)",
  "Refund processing timeframe after acceptance",
  "Governing jurisdiction / forum in India",
  "Any applicable tax disclosures beyond confirmed non-registration for GST",
] as const;
