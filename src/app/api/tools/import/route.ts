import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

function parsePage(html: string, pageUrl: string): {
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

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid URL." },
      { status: 400 },
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { ok: false, message: "Only http and https URLs are allowed." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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

    const html = await res.text();
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
        : err instanceof Error
          ? err.message
          : "Failed to fetch URL.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
