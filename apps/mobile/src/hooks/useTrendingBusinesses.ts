import { useQuery } from "@tanstack/react-query";
import { supabase, SUPABASE_CONFIG_OK } from "../integrations/supabase/client";

export function useTrendingBusinesses() {
  return useQuery({
    queryKey: ["trending-businesses"],
    queryFn: async () => {
      if (!SUPABASE_CONFIG_OK) return [];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: analytics, error: aErr } = await supabase
        .from("card_analytics")
        .select("business_card_id")
        .eq("event_type", "view")
        .gte("created_at", weekAgo.toISOString());
      if (aErr) throw aErr;

      const viewCounts: Record<string, number> = {};
      (analytics || []).forEach((a) => {
        viewCounts[a.business_card_id] = (viewCounts[a.business_card_id] || 0) + 1;
      });

      const topIds = Object.entries(viewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      if (topIds.length === 0) return [];

      const { data: cards, error: cErr } = await supabase
        .from("business_cards")
        .select("*")
        .in("id", topIds);
      if (cErr) throw cErr;

      return (cards || [])
        .map((c) => ({ ...c, viewCount: viewCounts[c.id] || 0 }))
        .sort((a, b) => b.viewCount - a.viewCount);
    },
    staleTime: 5 * 60 * 1000,
    enabled: SUPABASE_CONFIG_OK,
  });
}
