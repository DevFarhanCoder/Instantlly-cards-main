/**
 * Deferred group join utility
 *
 * Flow (Android):
 *  1. User taps invite link on web → redirected to Play Store with
 *     referrer=ic_join_XXXX in the URL.
 *  2. After install, on first app open this module reads the install
 *     referrer via expo-application and saves the join code to AsyncStorage.
 *  3. After the user signs up / logs in, useDeferredGroupJoin hook picks
 *     up the saved code, calls the join API, schedules a local notification,
 *     and clears the pending code.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const PENDING_KEY = 'ic_pending_group_join';
const REFERRER_CHECKED_KEY = 'ic_referrer_checked';

/**
 * Reads the Play Store install referrer once (on first launch after install).
 * If it contains `ic_join_XXXX`, the join code is saved to AsyncStorage.
 * Safe to call on every app start — skips silently after the first run.
 */
export async function checkInstallReferrer(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const alreadyChecked = await AsyncStorage.getItem(REFERRER_CHECKED_KEY);
    if (alreadyChecked) return;

    // Mark as checked immediately so we only ever run once
    await AsyncStorage.setItem(REFERRER_CHECKED_KEY, '1');

    const referrer = await Application.getInstallReferrerAsync();
    if (!referrer) return;

    // Match ic_join_XXXX (4-digit numeric code)
    const match = referrer.match(/ic_join_([0-9]{4})/);
    if (match) {
      await AsyncStorage.setItem(PENDING_KEY, match[1]);
    }
  } catch {
    // Non-blocking — never throw
  }
}

/** Returns the pending join code stored from the install referrer, or null. */
export async function getPendingJoinCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

/** Clears the pending join code after it has been processed. */
export async function clearPendingJoinCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch {
    // Non-blocking
  }
}
