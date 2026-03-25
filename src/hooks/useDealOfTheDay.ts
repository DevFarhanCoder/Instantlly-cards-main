import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDealOfTheDay() {
  return useQuery({
    queryKey: ["deal-of-the-day"],
    queryFn: async () => {
      // Get active vouchers with highest discount percentage, rotate daily
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("status", "active")
        .gt("original_price", 0)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Pick one based on day of year for daily rotation
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const sorted = data.sort((a, b) => {
        const discA = ((a.original_price - a.discounted_price) / a.original_price) * 100;
        const discB = ((b.original_price - b.discounted_price) / b.original_price) * 100;
        return discB - discA;
      });
      // Rotate through top deals
      return sorted[dayOfYear % sorted.length];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
