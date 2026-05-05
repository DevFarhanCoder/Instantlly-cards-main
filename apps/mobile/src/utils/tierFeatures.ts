/**
 * Tier-based feature access control (frontend mirror of backend).
 *
 * Tiers: free < growth < boost < scale
 * Role = access (customer, business)
 * Plan = billing (free, premium)
 * Tier = features (free, growth, boost, scale)
 */

export type Tier = 'free' | 'growth' | 'boost' | 'scale';

export type Feature =
  | 'basic_listing'
  | 'analytics'
  | 'basic_ads'
  | 'ads'
  | 'voucher'
  | 'priority_listing'
  | 'max_visibility';

export const TIER_FEATURES: Record<Tier, Feature[]> = {
  free: ['basic_listing', 'voucher'],
  growth: ['basic_listing', 'analytics', 'basic_ads', 'voucher'],
  boost: ['basic_listing', 'analytics', 'basic_ads', 'ads', 'voucher', 'priority_listing'],
  scale: ['basic_listing', 'analytics', 'basic_ads', 'ads', 'voucher', 'priority_listing', 'max_visibility'],
};

export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  growth: 1,
  boost: 2,
  scale: 3,
};

export const TIER_COLORS: Record<Tier, string> = {
  free: '#6B7280',
  growth: '#2563EB',
  boost: '#7C3AED',
  scale: '#F59E0B',
};

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  growth: 'Growth',
  boost: 'Boost',
  scale: 'Scale',
};

export function hasFeature(tier: string | null | undefined, feature: Feature): boolean {
  const t = (tier || 'free') as Tier;
  const features = TIER_FEATURES[t] ?? TIER_FEATURES.free;
  return features.includes(feature);
}

export function getTierLabel(tier: string | null | undefined): string {
  return TIER_LABELS[(tier || 'free') as Tier] ?? 'Free';
}

export function getTierColor(tier: string | null | undefined): string {
  return TIER_COLORS[(tier || 'free') as Tier] ?? TIER_COLORS.free;
}

/** Minimum tier required to access a feature */
export const FEATURE_MIN_TIER: Record<Feature, Tier> = {
  basic_listing: 'free',
  analytics: 'growth',
  basic_ads: 'growth',
  ads: 'boost',
  voucher: 'boost',
  priority_listing: 'boost',
  max_visibility: 'scale',
};

/** Resolve the working tier — expired/inactive promotions act as free. */
export function effectiveTier(
  tier: string | null | undefined,
  status: string | null | undefined,
): Tier {
  return status === 'active' ? ((tier || 'free') as Tier) : 'free';
}

/** Friendly message for upgrade prompts. */
export function upgradeMessage(feature: Feature): string {
  const min = FEATURE_MIN_TIER[feature];
  return `This feature requires the ${getTierLabel(min)} plan or higher. Upgrade to unlock it.`;
}
