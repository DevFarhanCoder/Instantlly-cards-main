/**
 * offlineCheckin.ts
 *
 * Local storage layer for offline QR check-in.
 * Uses AsyncStorage to persist the attendee list and pending sync queue.
 *
 * Flow:
 *  1. Scanner downloads attendee list before the event (downloadCheckinList)
 *  2. On scan: try online first. If network fails, call lookupQrCode + markCheckedInLocally
 *  3. After event / when back online: call syncPendingCheckins
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CachedAttendee {
  qr_code: string;
  user_name: string;
  user_phone: string;
  ticket_count: number;
  checked_in: boolean;
  checked_in_at: string | null;
  is_cancelled: boolean;
}

export interface PendingCheckin {
  qr_code: string;
  checked_in_at: string;
}

export interface SyncResult {
  synced: number;
  already_used: number;
  not_found: number;
  cancelled: number;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const listKey = (eventId: number) => `offline_checkin_list_${eventId}`;
const pendingKey = (eventId: number) => `offline_checkin_pending_${eventId}`;
const downloadedAtKey = (eventId: number) => `offline_checkin_downloaded_at_${eventId}`;

// ─── Download ─────────────────────────────────────────────────────────────────

/**
 * Fetch the full attendee list from the server and cache it locally.
 * Must be called while online, before the event.
 */
export async function downloadCheckinList(
  eventId: number,
  apiUrl: string,
  token: string,
): Promise<{ count: number }> {
  const res = await fetch(`${apiUrl}/api/events/${eventId}/checkin-list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const list: CachedAttendee[] = await res.json();
  await AsyncStorage.setItem(listKey(eventId), JSON.stringify(list));
  await AsyncStorage.setItem(downloadedAtKey(eventId), new Date().toISOString());
  return { count: list.length };
}

// ─── Read cache ───────────────────────────────────────────────────────────────

export async function getCheckinList(eventId: number): Promise<CachedAttendee[]> {
  const raw = await AsyncStorage.getItem(listKey(eventId));
  return raw ? JSON.parse(raw) : [];
}

export async function getLastDownloadTime(eventId: number): Promise<string | null> {
  return AsyncStorage.getItem(downloadedAtKey(eventId));
}

/** Look up a single attendee by QR code from the local cache. */
export async function lookupQrCode(
  eventId: number,
  qrCode: string,
): Promise<CachedAttendee | null> {
  const list = await getCheckinList(eventId);
  return list.find((a) => a.qr_code === qrCode) ?? null;
}

// ─── Offline check-in ─────────────────────────────────────────────────────────

/**
 * Update the cached list to mark a QR as checked in.
 * Does NOT add to the pending sync queue (use this after a successful online scan).
 */
export async function markCheckedInCache(
  eventId: number,
  qrCode: string,
): Promise<void> {
  const now = new Date().toISOString();
  const list = await getCheckinList(eventId);
  const idx = list.findIndex((a) => a.qr_code === qrCode);
  if (idx !== -1) {
    list[idx].checked_in = true;
    list[idx].checked_in_at = now;
    await AsyncStorage.setItem(listKey(eventId), JSON.stringify(list));
  }
}

/**
 * Mark an attendee as checked in locally (no network required).
 * Updates the cached list AND adds the entry to the pending sync queue.
 */
export async function markCheckedInLocally(
  eventId: number,
  qrCode: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Update cached list
  const list = await getCheckinList(eventId);
  const idx = list.findIndex((a) => a.qr_code === qrCode);
  if (idx !== -1) {
    list[idx].checked_in = true;
    list[idx].checked_in_at = now;
    await AsyncStorage.setItem(listKey(eventId), JSON.stringify(list));
  }

  // Add to pending sync queue (deduplicated)
  const rawPending = await AsyncStorage.getItem(pendingKey(eventId));
  const pending: PendingCheckin[] = rawPending ? JSON.parse(rawPending) : [];
  if (!pending.find((p) => p.qr_code === qrCode)) {
    pending.push({ qr_code: qrCode, checked_in_at: now });
    await AsyncStorage.setItem(pendingKey(eventId), JSON.stringify(pending));
  }
}

// ─── Pending sync ─────────────────────────────────────────────────────────────

export async function getPendingSync(eventId: number): Promise<PendingCheckin[]> {
  const raw = await AsyncStorage.getItem(pendingKey(eventId));
  return raw ? JSON.parse(raw) : [];
}

/**
 * Send all pending offline check-ins to the server.
 * Clears the queue on success.
 */
export async function syncPendingCheckins(
  eventId: number,
  apiUrl: string,
  token: string,
): Promise<SyncResult> {
  const pending = await getPendingSync(eventId);
  if (pending.length === 0) {
    return { synced: 0, already_used: 0, not_found: 0, cancelled: 0 };
  }

  const res = await fetch(`${apiUrl}/api/events/${eventId}/checkin-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ check_ins: pending }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const result: SyncResult = await res.json();

  // Clear the queue after a successful sync
  await AsyncStorage.removeItem(pendingKey(eventId));

  return result;
}

/** Clear all cached data for an event (call after event ends). */
export async function clearEventCache(eventId: number): Promise<void> {
  await AsyncStorage.multiRemove([
    listKey(eventId),
    pendingKey(eventId),
    downloadedAtKey(eventId),
  ]);
}
