import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  billing_cycle: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  created_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: async ({ plan, billing_cycle }: { plan: string; billing_cycle: string }) => {
      // Deactivate existing
      await supabase.from("subscriptions").update({ status: "cancelled" }).eq("user_id", user!.id).eq("status", "active");
      // Create new
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({ user_id: user!.id, plan, billing_cycle })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });

  return {
    subscription: subscriptionQuery.data,
    isLoading: subscriptionQuery.isLoading,
    currentPlan: subscriptionQuery.data?.plan ?? "free",
    subscribe,
  };
}
