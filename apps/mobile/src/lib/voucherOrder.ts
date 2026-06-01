import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "voucherDisplayOrder.v1";

/**
 * Load the saved voucher display order. Returns an array of voucher IDs (as strings)
 * representing the user-selected order. Vouchers not in this list are appended at
 * the end of the display in their natural order.
 */
export async function loadVoucherOrder(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x: any) => String(x));
  } catch {
    return [];
  }
}

/** Save the voucher display order. */
export async function saveVoucherOrder(ids: Array<string | number>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids.map((x) => String(x))));
  } catch {
    // best-effort; ignore
  }
}

/**
 * Apply a saved order to a list of items keyed by `id`. Items present in `order`
 * appear first (in the order given), then any remaining items keep their original
 * relative order at the end.
 */
export function applyVoucherOrder<T extends { id: string | number }>(
  items: T[],
  order: string[],
): T[] {
  if (!order || order.length === 0) return items;
  const orderIndex = new Map<string, number>();
  order.forEach((id, i) => orderIndex.set(id, i));

  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (orderIndex.has(String(item.id))) {
      pinned.push(item);
    } else {
      rest.push(item);
    }
  }
  pinned.sort(
    (a, b) => (orderIndex.get(String(a.id)) ?? 0) - (orderIndex.get(String(b.id)) ?? 0),
  );
  return [...pinned, ...rest];
}
