/**
 * Parse a category string from the tree picker into a clean string array.
 *
 * Supported input formats:
 *  1. "ParentCategory > Sub1, Sub2, Sub3"  → ["ParentCategory", "Sub1", "Sub2", "Sub3"]
 *  2. "SingleCategory"                      → ["SingleCategory"]
 *  3. "Custom: UserInput"                   → ["UserInput"]
 *  4. Already an array                      → returned as-is (trimmed)
 *  5. null / undefined / ""                 → []
 */
export function parseCategoryString(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];

  // Already an array — just trim & dedupe
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((s) => s.trim()).filter(Boolean))];
  }

  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Handle "Custom: xyz"
  if (trimmed.startsWith("Custom:")) {
    const custom = trimmed.slice("Custom:".length).trim();
    return custom ? [custom] : [];
  }

  // Handle "Parent > Sub1, Sub2, Sub3"
  if (trimmed.includes(">")) {
    const [parentPart, ...rest] = trimmed.split(">");
    const parent = parentPart.trim();
    const subs = rest
      .join(">") // rejoin in case value itself had a >
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result: string[] = [];
    if (parent) result.push(parent);
    for (const sub of subs) {
      if (!result.includes(sub)) result.push(sub);
    }
    return result;
  }

  // Plain single category
  return [trimmed];
}
