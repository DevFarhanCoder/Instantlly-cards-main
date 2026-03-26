import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useReferrals() {
  const { user } = useAuth();

  const { data: referrals = [], isLoading, refetch } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const referralCount = referrals.length;
  const completedCount = referrals.filter((r: any) => r.status === "completed").length;
  const totalEarnings = referrals
    .filter((r: any) => r.status === "completed")
    .reduce((sum: number, r: any) => sum + (r.reward_amount || 0), 0);

  return { referrals, referralCount, completedCount, totalEarnings, isLoading, refetch };
}
