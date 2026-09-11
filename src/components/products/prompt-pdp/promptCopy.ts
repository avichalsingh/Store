import type { PromptProductPublic } from "@/types";

export type PromptUnlockItem = {
  title: string;
  detail: string;
};

export type PromptPeekSection = {
  label: string;
  /** Short public-safe snippet, or empty when locked. */
  preview: string;
  locked: boolean;
};

/** Display title without redundant “Prompt” suffix. */
export function promptDisplayTitle(product: PromptProductPublic): string {
  return product.title
    .replace(/\s+prompt\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Outcome-focused line for the hero visual overlay. */
export function promptHeroHook(product: PromptProductPublic): string {
  const can = product.canGenerate?.trim();
  if (can) {
    const lowered = can.charAt(0).toLowerCase() + can.slice(1);
    return `Create ${lowered}.`.replace(/\.\.$/, ".");
  }
  if (product.shortDescription?.trim()) return product.shortDescription.trim();
  return "Unlock a creative shortcut you can reuse.";
}

/**
 * Compact “what you can create” items from public product fields only.
 * Never reads the paid mainPrompt.
 */
export function promptUnlockItems(
  product: PromptProductPublic,
): PromptUnlockItem[] {
  const tags = new Set(product.tags.map((t) => t.toLowerCase()));
  const category = (product.category || "").toLowerCase();
  const can = product.canGenerate?.trim();
  const items: PromptUnlockItem[] = [];

  if (can) {
    items.push({
      title: can,
      detail: "The outcome this prompt is built to produce.",
    });
  }

  if (
    tags.has("character") ||
    tags.has("consistent") ||
    category.includes("character")
  ) {
    items.push({
      title: "Recognizable character identity",
      detail: "Keep the same visual personality across generations.",
    });
  }

  if (
    tags.has("style") ||
    tags.has("pixar") ||
    tags.has("cinematic") ||
    tags.has("fashion") ||
    category.includes("fashion") ||
    category.includes("commercial")
  ) {
    items.push({
      title: "Consistent visual style",
      detail: "Lock the aesthetic instead of starting from scratch each time.",
    });
  }

  if (
    tags.has("pose") ||
    tags.has("scene") ||
    tags.has("reels") ||
    tags.has("viral") ||
    category.includes("reel")
  ) {
    items.push({
      title: "Multiple poses & scenes",
      detail: "Adapt the subject while preserving the core look.",
    });
  }

  if (tags.has("transformation") || category.includes("transformation")) {
    items.push({
      title: "Identity-aware restyles",
      detail: "Shift the look without losing who the subject is.",
    });
  }

  if (tags.has("fantasy") || category.includes("fantasy")) {
    items.push({
      title: "Original creature direction",
      detail: "Material, glow, and silhouette cues baked into the system.",
    });
  }

  if (tags.has("funny") || tags.has("meme") || category.includes("comedy")) {
    items.push({
      title: "Meme-ready personality",
      detail: "Readable expressions and poses built for phone-size impact.",
    });
  }

  // Always close with creative direction if we still have room
  if (items.length < 4) {
    items.push({
      title: "Built-in creative direction",
      detail: "Less trial and error — more usable results from the start.",
    });
  }

  // Deduplicate by title, cap at 4
  const seen = new Set<string>();
  const unique: PromptUnlockItem[] = [];
  for (const item of items) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 4) break;
  }

  while (unique.length < 3) {
    unique.push({
      title: "Reusable generation system",
      detail: "Copy into your AI tool whenever you need the same result again.",
    });
    break;
  }

  return unique.slice(0, 4);
}

const DEFAULT_SECTION_LABELS = [
  "Character foundation",
  "Visual style",
  "Pose & scene direction",
  "Finishing notes",
] as const;

function sectionLabelsForProduct(product: PromptProductPublic): string[] {
  const tags = new Set(product.tags.map((t) => t.toLowerCase()));
  const category = (product.category || "").toLowerCase();

  if (tags.has("food") || category.includes("food")) {
    return ["Food character base", "Material & lighting", "Personality cues"];
  }
  if (tags.has("product") || category.includes("commercial")) {
    return ["Product hero setup", "Lighting & lens", "Editorial grade"];
  }
  if (tags.has("reels") || category.includes("reel")) {
    return ["Hook frame", "Motion & silhouette", "Payoff expression"];
  }
  if (tags.has("transformation") || category.includes("transformation")) {
    return ["Identity lock", "Style recipe", "Portrait finish"];
  }
  if (tags.has("fantasy") || category.includes("fantasy")) {
    return ["Creature silhouette", "Material & glow", "Atmosphere"];
  }
  if (tags.has("fashion") || category.includes("fashion")) {
    return ["Character base", "Fabric & styling", "Editorial pose"];
  }
  return [...DEFAULT_SECTION_LABELS];
}

/**
 * Public “look inside” structure.
 * Uses only publicTeaser fragments — never mainPrompt / negativePrompt.
 */
export function promptPeekSections(
  product: PromptProductPublic,
): PromptPeekSection[] {
  const count = Math.min(Math.max(product.sectionCount ?? 3, 2), 4);
  const labels = sectionLabelsForProduct(product).slice(0, count);

  const teaser = (product.publicTeaser || "").trim();
  const fragments = teaser
    .split(/,\s*/)
    .map((s) => s.replace(/…+$/g, "").trim())
    .filter(Boolean);

  return labels.map((label, index) => {
    const locked = index >= Math.min(2, Math.max(1, fragments.length));
    if (locked || !fragments[index]) {
      return { label, preview: "", locked: true };
    }
    const raw = fragments[index]!;
    const preview =
      raw.length > 56 ? `${raw.slice(0, 54).trimEnd()}…` : raw;
    return { label, preview, locked: false };
  });
}

export function promptUseCases(product: PromptProductPublic): {
  builtFor: string;
  bestFor: string;
} {
  const can = product.canGenerate?.trim();
  const category = product.category?.trim() || "AI creation";
  return {
    builtFor: can || `${category} generation`,
    bestFor:
      product.tags
        .filter((t) => !/^prompt$/i.test(t))
        .slice(0, 3)
        .join(" · ") || category,
  };
}
