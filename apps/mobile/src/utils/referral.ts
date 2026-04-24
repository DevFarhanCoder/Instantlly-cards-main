import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_REFERRAL_KEY = 'pendingReferralCode';
const REFERRAL_INSTALL_CHECKED_KEY = 'ic_referral_install_checked';

/**
 * Extract a referral code from a deep-link URL.
 * Supports: instantllycards://signup?utm_campaign=ABC123XY
 */
export function parseReferralFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.utm_campaign;
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim().toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check the initial URL that launched the app and store any referral code.
 * Call this once on app startup.
 */
export async function captureInitialReferralIfPresent(): Promise<void> {
  try {
    const url = await Linking.getInitialURL();
    if (!url) return;
    const code = parseReferralFromUrl(url);
    if (code) {
      await SecureStore.setItemAsync(PENDING_REFERRAL_KEY, code);
    }
  } catch {
    // Silently fail — never block startup
  }
}

/**
 * On Android, reads the Play Store install referrer once on first launch.
 * If the referrer contains utm_campaign=REFCODE (set by the Refer & Earn share link),
 * saves the code to SecureStore so it is auto-filled during signup.
 * Safe to call on every app start — skips silently after the first run.
 */
export async function captureInstallReferralIfPresent(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const alreadyChecked = await AsyncStorage.getItem(REFERRAL_INSTALL_CHECKED_KEY);
    if (alreadyChecked) return;

    // Mark as checked immediately so we only ever run once per install
    await AsyncStorage.setItem(REFERRAL_INSTALL_CHECKED_KEY, '1');

    const referrer = await Application.getInstallReferrerAsync();
    if (!referrer) return;

    // Match utm_campaign=REFCODE (6-char alphanumeric code set by Refer & Earn share link)
    const match = referrer.match(/utm_campaign=([A-Z0-9]{4,12})/i);
    if (match) {
      await SecureStore.setItemAsync(PENDING_REFERRAL_KEY, match[1].toUpperCase());
    }
  } catch {
    // Non-blocking — never throw
  }
}

/**
 * Retrieve and clear the pending referral code (if any).
 * Call this during signup to pass to the backend.
 */
export async function consumePendingReferral(): Promise<string | null> {
  try {
    const code = await SecureStore.getItemAsync(PENDING_REFERRAL_KEY);
    if (code) {
      await SecureStore.deleteItemAsync(PENDING_REFERRAL_KEY);
    }
    return code ?? null;
  } catch {
    return null;
  }
}

/**
 * Manually store a referral code (e.g., from a text input on the signup screen).
 */
export async function storePendingReferral(code: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_REFERRAL_KEY, code.trim().toUpperCase());
}
