import { useEffect, useRef } from "react";
import {
  useListActiveCampaignsQuery,
  useGetCampaignVariantsQuery,
  useTrackImpressionMutation,
  useTrackClickMutation,
  type AdCampaign,
  type AdVariant,
} from "../store/api/adsApi";

export type ActiveAd = AdCampaign;
export type ActiveAdVariant = AdVariant;

export function useActiveAds(adType?: string) {
  const result = useListActiveCampaignsQuery(
    adType ? { ad_type: adType } : undefined
  );
  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

export function useAdVariants(campaignId: number | string | undefined) {
  const id = typeof campaignId === "string" ? parseInt(campaignId, 10) : campaignId;
  const result = useGetCampaignVariantsQuery(id!, { skip: !id });
  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
  };
}

const impressionSet = new Set<number>();

export function useRecordImpression(campaignId: number | undefined, variantId?: number) {
  const [trigger] = useTrackImpressionMutation();
  const recorded = useRef(false);

  useEffect(() => {
    if (!campaignId || recorded.current || impressionSet.has(campaignId)) return;
    recorded.current = true;
    impressionSet.add(campaignId);
    trigger({ id: campaignId, variant_id: variantId });
  }, [campaignId, variantId, trigger]);
}

export function useRecordClick() {
  const [trigger] = useTrackClickMutation();
  return (campaignId: number, variantId?: number) => {
    trigger({ id: campaignId, variant_id: variantId });
  };
}
