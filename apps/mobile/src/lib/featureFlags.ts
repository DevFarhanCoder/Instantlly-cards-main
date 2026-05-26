/**
 * Feature Flags
 *
 * Set a flag to `true` to enable the feature, `false` to hide it.
 * Disabled features are completely excluded from the UI and API.
 */
export const FEATURES = {
  /** Bulk Send — send a business card to a whole category/zone. Not ready for production. */
  BULK_SEND: false,
  /** "You saved ₹X" savings banner on claimed voucher cards in My Vouchers. */
  VOUCHER_SAVINGS_BANNER: false,
  /** Installment status row (Installment Active/Paid/Expired) on claimed voucher cards in My Vouchers. */
  VOUCHER_INSTALLMENT_STATUS: false,
  /** Pending Transfers banner on My Created Vouchers (admin / Rajesh Modi). */
  PENDING_TRANSFERS_VIEW: false,
} as const;
