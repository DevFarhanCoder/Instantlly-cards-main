import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useBusinessFollows(businessCardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const followersQuery = useQuery({
    queryKey: ["business-followers", businessCardId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("business_follows")
        .select("*", { count: "exact", head: true })
        .eq("business_card_id", businessCardId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!businessCardId,
  });

  const isFollowingQuery = useQuery({
    queryKey: ["is-following", businessCardId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_follows")
        .select("id")
        .eq("business_card_id", businessCardId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!businessCardId && !!user,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowingQuery.data) {
        const { error } = await supabase
          .from("business_follows")
          .delete()
          .eq("business_card_id", businessCardId!)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_follows")
          .insert({ business_card_id: businessCardId!, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-followers", businessCardId] });
      queryClient.invalidateQueries({ queryKey: ["is-following", businessCardId] });
      queryClient.invalidateQueries({ queryKey: ["followed-businesses"] });
    },
  });

  return {
    followersCount: followersQuery.data ?? 0,
    isFollowing: isFollowingQuery.data ?? false,
    toggleFollow,
    isLoading: followersQuery.isLoading,
  };
}

export function useFollowedBusinesses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["followed-businesses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_follows")
        .select("business_card_id, created_at, business_cards(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}
