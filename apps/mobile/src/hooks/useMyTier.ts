import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useGetMyPromotionsQuery } from '../store/api/promotionsApi';
import { effectiveTier, TIER_RANK, type Tier } from '../utils/tierFeatures';

/**
 * Returns the user's best active tier from their promotions.
 * Falls back to 'free' if no active promotion or not logged in.
 */
export function useMyTier(): { tier: Tier; isLoading: boolean } {
  const { user } = useAuth();
  const { data: promos = [], isLoading } = useGetMyPromotionsQuery(undefined, {
    skip: !user,
  });

  const tier = useMemo<Tier>(() => {
    if (!user || promos.length === 0) return 'free';
    let best: Tier = 'free';
    for (const p of promos) {
      const t = effectiveTier(p.tier, p.status);
      if ((TIER_RANK[t] ?? 0) > (TIER_RANK[best] ?? 0)) best = t;
    }
    return best;
  }, [user, promos]);

  return { tier, isLoading };
}
