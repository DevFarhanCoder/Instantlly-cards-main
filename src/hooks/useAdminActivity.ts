import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export function useActivityFeed(limit = 50) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-activity-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 15000,
  });
}

export function useAdminAlerts() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
    refetchInterval: 10000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_alerts")
        .update({ is_read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-alerts"] }),
  });
}

export function useAdminCampaigns() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: { admin_user_id: string; title: string; body?: string; campaign_type?: string; target_audience?: string }) => {
      const { error } = await supabase.from("campaigns").insert(campaign as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Campaign created!");
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "sent" } as any)
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Campaign sent!");
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, ids, status }: { type: "business_cards" | "events" | "ad_campaigns"; ids: string[]; status: string }) => {
      for (const id of ids) {
        const { error } = await supabase
          .from(type)
          .update({ approval_status: status } as any)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { type }) => {
      qc.invalidateQueries({ queryKey: ["admin-business-cards"] });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      toast.success("Bulk action completed!");
    },
  });
}
