export type RazorpayPrefill = {
  name?: string;
  email?: string;
  contact?: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: RazorpayPrefill;
  theme?: { color?: string };
};

export type RazorpayCheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/**
 * Returns true if the native Razorpay SDK is available (dev build).
 * Returns false in Expo Go where native modules aren't linked.
 */
export function isNativeRazorpayAvailable(): boolean {
  try {
    const mod = require('react-native-razorpay');
    const Checkout = mod?.default ?? mod;
    return typeof Checkout?.open === 'function';
  } catch {
    return false;
  }
}

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutSuccess> {
  const mod = require('react-native-razorpay');
  const RazorpayCheckout = mod?.default ?? mod;

  if (typeof RazorpayCheckout?.open !== 'function') {
    throw new Error('NATIVE_UNAVAILABLE');
  }

  const result = await RazorpayCheckout.open(options);
  return result as RazorpayCheckoutSuccess;
}
