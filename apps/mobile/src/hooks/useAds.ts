import { useAuth } from "./useAuth";
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
  const result = useGetMyCampaignsQuery(undefined, { skip: !user });
  return {
    data: result.data ?? [],
    isLoading: result.isLoading,
    refetch: result.refetch,
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
