/**
 * Feature Flags
 *
 * Set a flag to `true` to enable the feature, `false` to hide it.
 * Disabled features are completely excluded from the UI and API.
 */
export const FEATURES = {
  /** Bulk Send — send a business card to a whole category/zone. Not ready for production. */
  BULK_SEND: false,
} as const;
