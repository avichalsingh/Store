/**
 * Pure helpers for Homepage CMS visual curation (Stage 1).
 * Operates on ordered ID lists only — never mutates catalog entities.
 */

/** Append ids that are not already present; preserve existing order. */
export function appendUniqueIds(
  current: string[],
  incoming: string[],
): string[] {
  const seen = new Set(current);
  const next = [...current];
  for (const id of incoming) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/** Remove one id; leave the rest (including unavailable) intact. */
export function removeSelectedId(current: string[], id: string): string[] {
  return current.filter((x) => x !== id);
}

/**
 * Drag-reorder: move `fromId` so it lands at the index of `toId`.
 * Unknown ids are ignored (list unchanged).
 */
export function reorderSelectedId(
  current: string[],
  fromId: string,
  toId: string,
): string[] {
  if (fromId === toId) return current;
  const next = [...current];
  const from = next.indexOf(fromId);
  const to = next.indexOf(toId);
  if (from < 0 || to < 0) return current;
  next.splice(from, 1);
  next.splice(to, 0, fromId);
  return next;
}

/** Single-select: empty string / clear → []; otherwise exactly one id. */
export function setSingleSelectedId(
  id: string | null | undefined,
): string[] {
  if (!id || !id.trim()) return [];
  return [id.trim()];
}

/** Dedupe while keeping first occurrence order. */
export function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}
