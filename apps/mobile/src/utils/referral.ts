import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

const PENDING_REFERRAL_KEY = 'pendingReferralCode';

/**
 * Extract a referral code from a deep-link URL.
 * Supports: instantlly://signup?ref=ABC123, https://instantlly.app/signup?ref=ABC123
 */
export function parseReferralFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const ref = parsed.queryParams?.ref;
    if (typeof ref === 'string' && ref.trim().length > 0) {
      return ref.trim().toUpperCase();
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
