import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export function useAdminPendingCounts() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  return useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      const [cards, events, ads, vouchers, reports, disputes, tickets, reviews] =
        await Promise.all([
          supabase
            .from("business_cards")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "pending"),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "pending"),
          supabase
            .from("ad_campaigns")
            .select("id", { count: "exact", head: true })
            .eq("approval_status", "pending"),
          supabase
            .from("vouchers")
            .select("id", { count: "exact", head: true })
            .eq("status", "draft"),
          supabase
            .from("business_reports")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("disputes")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .eq("status", "open"),
          supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("is_flagged", true),
        ]);

      return {
        pendingCards: cards.count ?? 0,
        pendingEvents: events.count ?? 0,
        pendingAds: ads.count ?? 0,
        pendingVouchers: vouchers.count ?? 0,
        openReports: reports.count ?? 0,
        openDisputes: disputes.count ?? 0,
        openTickets: tickets.count ?? 0,
        flaggedReviews: reviews.count ?? 0,
      };
    },
    enabled: !!user && isAdmin,
    refetchInterval: 30000,
  });
}
