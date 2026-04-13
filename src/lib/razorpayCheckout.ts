/**
 * Razorpay Web Checkout utility.
 *
 * Dynamically loads the Razorpay checkout.js script and exposes
 * a promise-based `openRazorpayCheckout` helper that resolves on
 * successful payment and rejects on failure / dismissal.
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptLoaded = false;
let loadPromise: Promise<void> | null = null;

/** Inject the Razorpay checkout.js script once. */
export function loadRazorpayScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key_id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

/**
 * Open the Razorpay modal and return the payment result on success.
 * Throws on user dismissal or payment failure.
 */
export async function openRazorpayCheckout(
  opts: RazorpayCheckoutOptions
): Promise<RazorpayPaymentResult> {
  await loadRazorpayScript();

  return new Promise<RazorpayPaymentResult>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: opts.key_id,
      amount: opts.amount,
      currency: opts.currency,
      name: opts.name,
      description: opts.description || "",
      order_id: opts.order_id,
      prefill: opts.prefill || {},
      handler(response: RazorpayPaymentResult) {
        resolve(response);
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled by user"));
        },
      },
    });

    rzp.on("payment.failed", (response: any) => {
      reject(
        new Error(
          response?.error?.description || "Payment failed. Please try again."
        )
      );
    });

    rzp.open();
  });
}
