/**
 * Voucher creation is restricted to a single account (Rajesh Modi).
 * All other users see a contact gate (WhatsApp / Call) instead of being able
 * to create vouchers directly.
 *
 * Keep this constant in sync with the backend
 * (`instantllycardsbackendmain/src/utils/voucherAdmin.ts`).
 */
export const VOUCHER_ADMIN_PHONE = "9867477227";
export const VOUCHER_ADMIN_COUNTRY_CODE = "91";
export const VOUCHER_ADMIN_NAME = "Rajesh Modi";

/** Returns digits-only phone with country code stripped where possible. */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "");
}

/**
 * Returns true if the user is allowed to create vouchers.
 * Match logic: digits-only comparison; accepts numbers stored with or without
 * the country code (e.g. "9867477227" or "919867477227").
 */
export function isVoucherAdmin(user?: { phone?: string | null; roles?: string[] } | null): boolean {
  if (!user) return false;
  const digits = normalizePhone(user.phone);
  return !!digits && digits.endsWith(VOUCHER_ADMIN_PHONE);
}

/** Pre-filled WhatsApp message users send when requesting a voucher. */
export function buildVoucherRequestMessage(userName?: string | null, businessName?: string | null): string {
  const who = userName ? ` I'm ${userName}.` : "";
  const biz = businessName ? ` My business: ${businessName}.` : "";
  return `Hi ${VOUCHER_ADMIN_NAME},${who} I'd like to create a voucher for my business on Instantlly Cards.${biz} Please help me set it up.`;
}

/** Pre-filled WhatsApp message users send when they want to claim a voucher. */
export function buildVoucherClaimMessage(
  userName?: string | null,
  voucherTitle?: string | null,
  price?: number | string | null,
): string {
  const who = userName ? ` I'm ${userName}.` : "";
  const title = voucherTitle ? ` "${voucherTitle}"` : "";
  const amount = price != null && String(price).trim() !== "" ? ` (₹${price})` : "";
  return `Hi ${VOUCHER_ADMIN_NAME},${who} I'd like to claim the voucher${title}${amount} on Instantlly Cards. Please help me complete the claim.`;
}
