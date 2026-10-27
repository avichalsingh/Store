/**
 * Fail-closed paid download boundary.
 * Real signed master delivery requires server-verified order entitlements
 * (not yet implemented). Never trust client purchase flags or localStorage.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Secure download is not available until server-side purchase verification is enabled.",
      code: "ENTITLEMENT_REQUIRED",
    },
    { status: 403 },
  );
}

export async function POST() {
  return GET();
}
