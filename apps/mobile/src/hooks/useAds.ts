import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";

export interface AdCampaign {
  id: string;
  user_id: string;
  business_card_id: string | null;
  title: string;
  description: string | null;
  ad_type: string;
  cta: string;
  creative_url: string | null;
  creative_urls: string[];
  target_city: string | null;
  target_age: string;
  target_interests: string | null;
  daily_budget: number;
  duration_days: number;
  total_budget: number;
  impressions: number;
  clicks: number;
  spent: number;
  status: string;
  approval_status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdCampaigns() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ad-campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AdCampaign[];
    },
    enabled: !!user,
  });
}

export function useCreateAdCampaign() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: {
      title: string;
      description?: string;
      ad_type: string;
      cta?: string;
      target_city?: string;
      target_age?: string;
      target_interests?: string;
      daily_budget: number;
      duration_days: number;
      business_card_id?: string;
      creative_url?: string;
      creative_urls?: string[];
    }) => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + campaign.duration_days);

      const { data, error } = await supabase
        .from("ad_campaigns")
        .insert({
          title: campaign.title,
          description: campaign.description,
          ad_type: campaign.ad_type,
          cta: campaign.cta,
          target_city: campaign.target_city,
          target_age: campaign.target_age,
          target_interests: campaign.target_interests,
          daily_budget: campaign.daily_budget,
          duration_days: campaign.duration_days,
          business_card_id: campaign.business_card_id,
          creative_url: campaign.creative_url || null,
          creative_urls: campaign.creative_urls || [],
          user_id: user!.id,
          end_date: endDate.toISOString().split("T")[0],
        } as any)
        .select()
        .single();
      if (error) throw error;

      const urls = campaign.creative_urls || [];
      if (urls.length > 1) {
        const variants = urls.map((url, i) => ({
          campaign_id: (data as any).id,
          creative_url: url,
          label: String.fromCharCode(65 + i),
        }));
        await supabase.from("ad_variants").insert(variants as any);
      }

      return data as unknown as AdCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Ad campaign launched!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create campaign"),
  });
}

export function useUpdateAdCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string }) => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AdCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update campaign"),
  });
}
