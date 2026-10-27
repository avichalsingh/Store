import { requireAdminSession } from "@/lib/security/adminAuth";
import {
  clientIpFromRequest,
  rateLimit,
} from "@/lib/security/rateLimit";
import { assertSafeOutboundUrl } from "@/lib/security/ssrf";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 8_000;

type Extracted = {
  name: string;
  shortDescription: string;
  fullDescription: string;
  logoUrl: string;
  coverImageUrl: string;
  officialUrl: string;
};

function metaContent(html: string, property: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return decodeHtml(m[1].trim());
  }
  return "";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function absoluteUrl(base: string, maybeRelative: string): string {
  if (!maybeRelative) return "";
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

function extractFavicon(html: string, pageUrl: string): string {
  const linkRe =
    /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>/gi;
  const matches = html.match(linkRe) ?? [];
  for (const tag of matches) {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) return absoluteUrl(pageUrl, href);
  }
  try {
    const origin = new URL(pageUrl).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1] ? decodeHtml(m[1].trim()) : "";
}

function parsePage(
  html: string,
  pageUrl: string,
): {
  extracted: Extracted;
  warnings: string[];
} {
  const warnings: string[] = [];
  const ogTitle = metaContent(html, "og:title");
  const twitterTitle = metaContent(html, "twitter:title");
  const title = extractTitle(html);
  const name = ogTitle || twitterTitle || title;

  const ogDesc = metaContent(html, "og:description");
  const twitterDesc = metaContent(html, "twitter:description");
  const metaDesc = metaContent(html, "description");
  const description = ogDesc || twitterDesc || metaDesc;

  const ogImage = metaContent(html, "og:image");
  const twitterImage = metaContent(html, "twitter:image");
  const cover = absoluteUrl(pageUrl, ogImage || twitterImage);
  const logo = extractFavicon(html, pageUrl);

  if (!name) warnings.push("Could not find a title or og:title.");
  if (!description) warnings.push("Could not find a description.");
  if (!cover) warnings.push("Could not find an Open Graph or Twitter image.");
  if (!logo) warnings.push("Could not find a favicon.");
  warnings.push(
    "Pricing and sale data were not extracted — enter those manually.",
  );

  return {
    extracted: {
      name,
      shortDescription: description.slice(0, 180),
      fullDescription: description,
      logoUrl: logo,
      coverImageUrl: cover,
      officialUrl: pageUrl,
    },
    warnings,
  };
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`tools-import:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many import requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (!url) {
    return NextResponse.json(
      { ok: false, message: "A URL is required." },
      { status: 400 },
    );
  }
  if (url.length > 2048) {
    return NextResponse.json(
      { ok: false, message: "URL is too long." },
      { status: 400 },
    );
  }

  const unsafe = assertSafeOutboundUrl(url);
  if (unsafe) {
    return NextResponse.json({ ok: false, message: unsafe }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid URL." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "RHYTHM-ToolsImporter/1.0 (+https://rhythm.studio; admin import)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    // Re-check final URL after redirects (best-effort SSRF hardening).
    const finalUnsafe = assertSafeOutboundUrl(res.url || parsed.toString());
    if (finalUnsafe) {
      return NextResponse.json(
        { ok: false, message: "Redirect target is not allowed." },
        { status: 400 },
      );
    }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        url: parsed.toString(),
        message: `Fetch failed with status ${res.status}.`,
      });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/plain")
    ) {
      return NextResponse.json({
        ok: false,
        url: parsed.toString(),
        message: "URL did not return HTML content.",
      });
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      return NextResponse.json({
        ok: false,
        url: parsed.toString(),
        message: "Remote page is too large to import.",
      });
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const { extracted, warnings } = parsePage(html, parsed.toString());

    return NextResponse.json({
      ok: true,
      url: parsed.toString(),
      extracted,
      warnings,
    });
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    return NextResponse.json({
      ok: false,
      url: parsed.toString(),
      message: aborted
        ? "Request timed out after 8 seconds."
        : "Failed to fetch URL.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
