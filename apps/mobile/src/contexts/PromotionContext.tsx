import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useGetMyPromotionsQuery } from '../store/api/promotionsApi';
import { effectiveTier, type Tier } from '../utils/tierFeatures';

interface PromotionContextValue {
  /** All promotions belonging to the current user */
  promotions: any[];
  /** Currently selected promotion ID (null if none selected) */
  selectedPromotionId: number | null;
  /** Set the active promotion */
  selectPromotion: (id: number | null) => void;
  /** The selected promotion object */
  selectedPromotion: any | null;
  /** Effective tier of the selected promotion */
  tier: Tier;
  /** Whether promotions are loading */
  isLoading: boolean;
}

const PromotionContext = createContext<PromotionContextValue>({
  promotions: [],
  selectedPromotionId: null,
  selectPromotion: () => {},
  selectedPromotion: null,
  tier: 'free',
  isLoading: false,
});

const SELECTED_PROMOTION_KEY = 'selectedPromotionId';

export function PromotionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: promotions = [], isLoading } = useGetMyPromotionsQuery(undefined, { skip: !user });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SELECTED_PROMOTION_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          setSelectedId(parsed);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // All promotions (free + premium + pending) — no filtering
  const allPromos = useMemo(() => promotions as any[], [promotions]);

  console.log(`[PromotionContext] render: allPromos=${allPromos.length} selectedId=${selectedId} promos=${JSON.stringify(allPromos.map((p: any) => ({ id: p.id, name: p.business_name, tier: p.tier, status: p.status })))}`);

  const effectiveSelectedId = useMemo(() => {
    // If still loading promotions, keep stored id so we don't flash empty state.
    if (isLoading) return selectedId;
    // If user explicitly selected a promotion that exists, use it.
    if (selectedId && allPromos.some((p: any) => p.id === selectedId)) return selectedId;
    // Auto-select if only one promotion.
    if (allPromos.length === 1) return allPromos[0].id;
    // User has no promotions, or selection no longer exists → expose null so
    // screens can render a "Promote Business" CTA instead of a stale upgrade prompt.
    return null;
  }, [selectedId, allPromos, isLoading]);

  // Clear stale stored selection once promotions have loaded and the saved id is gone.
  useEffect(() => {
    if (isLoading) return;
    if (!selectedId) return;
    const stillExists = allPromos.some((p: any) => p.id === selectedId);
    if (!stillExists) {
      setSelectedId(null);
      AsyncStorage.removeItem(SELECTED_PROMOTION_KEY).catch(() => {});
    }
  }, [isLoading, selectedId, allPromos]);

  const selectedPromotion = useMemo(
    () => (promotions as any[]).find((p: any) => p.id === effectiveSelectedId) ?? null,
    [promotions, effectiveSelectedId],
  );

  const tier = useMemo<Tier>(() => {
    if (!selectedPromotion) return 'free';
    // Use the promotion's tier as-is — effectiveTier handles status-based downgrade
    return effectiveTier(selectedPromotion.tier, selectedPromotion.status);
  }, [selectedPromotion]);

  console.log(`[PromotionContext] effectiveSelectedId=${effectiveSelectedId} selectedPromotion=${selectedPromotion?.id ?? 'null'} tier=${tier} promoTier=${selectedPromotion?.tier ?? 'n/a'} promoStatus=${selectedPromotion?.status ?? 'n/a'} businessCardId=${selectedPromotion?.business_card_id ?? 'n/a'}`);

  const selectPromotion = useCallback((id: number | null) => {
    console.log(`[PromotionContext] selectPromotion called: ${id}`);
    setSelectedId(id);
    if (!id) {
      AsyncStorage.removeItem(SELECTED_PROMOTION_KEY).catch(() => {});
      return;
    }
    AsyncStorage.setItem(SELECTED_PROMOTION_KEY, String(id)).catch(() => {});
  }, []);

  const value = useMemo<PromotionContextValue>(
    () => ({
      promotions: promotions as any[],
      selectedPromotionId: effectiveSelectedId,
      selectPromotion,
      selectedPromotion,
      tier,
      isLoading,
    }),
    [promotions, effectiveSelectedId, selectPromotion, selectedPromotion, tier, isLoading],
  );

  return <PromotionContext.Provider value={value}>{children}</PromotionContext.Provider>;
}

export function usePromotionContext() {
  return useContext(PromotionContext);
}

/**
 * Returns the tier for a specific promotion by ID.
 * Falls back to 'free' if not found or not active.
 */
export function usePromotionTier(promotionId: number | null | undefined): { tier: Tier; isLoading: boolean } {
  const { promotions, isLoading } = usePromotionContext();
  const tier = useMemo<Tier>(() => {
    if (!promotionId) return 'free';
    const promo = promotions.find((p: any) => p.id === promotionId);
    if (!promo) return 'free';
    // effectiveTier downgrades non-active to 'free'
    return effectiveTier(promo.tier, promo.status);
  }, [promotionId, promotions]);
  console.log(`[usePromotionTier] promotionId=${promotionId} resolvedTier=${tier} totalPromos=${promotions.length}`);
  return { tier, isLoading };
}

/**
 * Returns the business_card_id linked to the currently selected promotion.
 */
export function useSelectedBusinessCardId(): number | null {
  const { selectedPromotion } = usePromotionContext();
  return selectedPromotion?.business_card_id ?? null;
}
