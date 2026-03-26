import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  points: number;
  type: string;
  source: string;
  description: string | null;
  created_at: string;
}

export function useLoyaltyPoints() {
  const { user } = useAuth();

  const pointsQuery = useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as LoyaltyPoints | null) ?? { points: 0, lifetime_points: 0 };
    },
    enabled: !!user,
  });

  const transactionsQuery = useQuery({
    queryKey: ["points-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as PointsTransaction[];
    },
    enabled: !!user,
  });

  return {
    points: pointsQuery.data,
    transactions: transactionsQuery.data ?? [],
    isLoading: pointsQuery.isLoading,
  };
}

export function useRedeemPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ points, description }: { points: number; description: string }) => {
      const { data, error } = await supabase.rpc("redeem_loyalty_points", {
        p_user_id: user!.id,
        p_points: points,
        p_description: description,
      });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-points"] });
      queryClient.invalidateQueries({ queryKey: ["points-transactions"] });
    },
  });
}
