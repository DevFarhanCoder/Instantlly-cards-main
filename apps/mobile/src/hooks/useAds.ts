import { useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useMyTier } from "./useMyTier";
import { hasFeature } from "../utils/tierFeatures";
import { toast } from "../lib/toast";
import {
  useGetMyCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  type AdCampaign,
  type CreateCampaignInput,
} from "../store/api/adsApi";

export type { AdCampaign };

export function useAdCampaigns() {
  const { user } = useAuth();
  const { tier } = useMyTier();
  const canView = hasFeature(tier, 'basic_ads');
  const skip = !user || !canView;
  const result = useGetMyCampaignsQuery(undefined, { skip });
  // Stabilise refetch so callers don't re-render when the query is skipped
  const refetchRef = useRef(result.refetch);
  refetchRef.current = result.refetch;
  const stableRefetch = useCallback(() => refetchRef.current(), []);
  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    refetch: stableRefetch,
  };
}

export function useCreateAdCampaign() {
  const [trigger, state] = useCreateCampaignMutation();
  return {
    mutateAsync: (input: CreateCampaignInput) => trigger(input).unwrap(),
    isPending: state.isLoading,
  };
}

export function useUpdateAdCampaign() {
  const [trigger, state] = useUpdateCampaignMutation();
  return {
    mutate: (input: { id: number; status?: string; [key: string]: any }) => {
      trigger(input).unwrap().catch((e: any) => toast.error(e?.data?.error || "Failed to update"));
    },
    mutateAsync: (input: { id: number; [key: string]: any }) => trigger(input).unwrap(),
    isPending: state.isLoading,
  };
}

export function useDeleteAdCampaign() {
  const [trigger, state] = useDeleteCampaignMutation();
  return {
    mutateAsync: (id: number) => trigger(id).unwrap(),
    isPending: state.isLoading,
  };
}
