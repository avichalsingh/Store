"use client";

import { Suspense, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToolsCatalog } from "@/catalog/tools/useToolsCatalog";
import { toolOutboundUrl, type AffiliateClick } from "@/catalog/tools/types";
import { recordToolClick } from "@/lib/toolClicks";

const VALID_SOURCES: AffiliateClick["source"][] = [
  "tools_browse",
  "tool_detail",
  "homepage_deals",
  "search",
  "other",
];

function parseSource(raw: string | null): AffiliateClick["source"] {
  if (raw && (VALID_SOURCES as string[]).includes(raw)) {
    return raw as AffiliateClick["source"];
  }
  return "other";
}

function ToolGoInner({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const { getById, hydrated } = useToolsCatalog();
  const tool = getById(id);

  useEffect(() => {
    if (!hydrated || !tool) return;
    const destination = toolOutboundUrl(tool);
    const source = parseSource(searchParams.get("src"));
    recordToolClick({
      toolId: tool.id,
      toolName: tool.name,
      source,
      destinationUrl: destination,
    });
    window.location.assign(destination);
  }, [hydrated, tool, searchParams]);

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 pt-28 text-center">
        <p className="text-sm text-muted">Opening…</p>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 pt-28 text-center">
        <h1 className="font-display text-2xl font-bold">Tool not found</h1>
        <p className="mt-2 text-sm text-muted">
          This tool may be inactive or removed.
        </p>
        <Link
          href="/tools"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 pt-28 text-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-accent/40" />
      <p className="mt-4 font-display text-xl font-bold">Opening {tool.name}…</p>
      <p className="mt-2 text-sm text-muted">
        Taking you to the official site. If nothing happens,{" "}
        <a
          href={toolOutboundUrl(tool)}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          continue here
        </a>
        .
      </p>
    </div>
  );
}

export default function ToolGoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 pt-28 text-center">
          <p className="text-sm text-muted">Opening…</p>
        </div>
      }
    >
      <ToolGoInner id={id} />
    </Suspense>
  );
}
