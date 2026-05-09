/**
 * Deferred event navigation utility
 *
 * Flow (Android):
 *  1. User taps event share link → opens share page HTML
 *  2. If app not installed → redirected to Play Store with referrer=ic_event_XXXX
 *  3. After install, on first app open this reads the install referrer and saves
 *     the event ID to AsyncStorage.
 *  4. After login, useDeferredEventNavigation hook picks it up and navigates to
 *     EventDetail for that event.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const PENDING_KEY = 'ic_pending_event_nav';
const REFERRER_CHECKED_KEY = 'ic_event_referrer_checked';

/**
 * Reads the Play Store install referrer once (on first launch after install).
 * If it contains `ic_event_XXXX`, saves the event ID to AsyncStorage.
 */
export async function checkEventInstallReferrer(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const alreadyChecked = await AsyncStorage.getItem(REFERRER_CHECKED_KEY);
    if (alreadyChecked) return;

    await AsyncStorage.setItem(REFERRER_CHECKED_KEY, '1');

    const referrer = await Application.getInstallReferrerAsync();
    if (!referrer) return;

    const match = referrer.match(/ic_event_([0-9]+)/);
    if (match) {
      await AsyncStorage.setItem(PENDING_KEY, match[1]);
    }
  } catch {
    // Non-blocking
  }
}

export async function getPendingEventId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingEventId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // Non-blocking
  }
}
