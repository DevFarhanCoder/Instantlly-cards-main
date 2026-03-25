import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

async function logAdminAction(adminId: string | undefined, action: string, entityType: string, entityId: string, description: string) {
  if (!adminId) return;
  await supabase.from("activity_logs").insert({
    event_type: action,
    entity_type: entityType,
    entity_id: entityId,
    user_id: adminId,
    description,
    metadata: { admin_id: adminId },
  } as any).then(() => {});
}

export function useAdminStats() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Try cached metrics first (from aggregate-stats edge function)
      const today = new Date().toISOString().split("T")[0];
      const { data: cached } = await supabase
        .from("admin_metrics_daily")
        .select("*")
        .eq("metric_date", today)
        .maybeSingle();

      if (cached) {
        return {
          businesses: cached.total_businesses,
          events: cached.total_events,
          vouchers: cached.total_vouchers,
          bookings: cached.total_bookings,
          ads: cached.total_ads,
          reviews: cached.total_reviews,
          subscriptions: cached.total_subscriptions,
          tickets: cached.total_tickets,
          users: cached.total_users,
          activeAds: cached.active_ads,
          activeSubscriptions: cached.active_subscriptions,
          newUsersToday: cached.new_users_today,
          newBookingsToday: cached.new_bookings_today,
          newBusinessesToday: cached.new_businesses_today,
          revenueAds: cached.revenue_ads,
          revenueSubscriptions: cached.revenue_subscriptions,
          revenueVouchers: cached.revenue_vouchers,
          revenueEvents: cached.revenue_events,
          cached: true,
        };
      }

      // Fallback to live counts
      const [cards, events, vouchers, bookings, ads, reviews, subs, tickets] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("vouchers").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("ad_campaigns").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      ]);
      return {
        businesses: cards.count ?? 0,
        events: events.count ?? 0,
        vouchers: vouchers.count ?? 0,
        bookings: bookings.count ?? 0,
        ads: ads.count ?? 0,
        reviews: reviews.count ?? 0,
        subscriptions: subs.count ?? 0,
        tickets: tickets.count ?? 0,
        cached: false,
      };
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminSpamFlags(entityType?: string) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-spam-flags", entityType],
    queryFn: async () => {
      let query = supabase
        .from("spam_flags")
        .select("*")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });
      if (entityType) {
        query = query.eq("entity_type", entityType);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useReviewSpamFlags() {
  return useAdminSpamFlags("review");
}

export function useResolveSpamFlag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("spam_flags")
        .update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-spam-flags"] });
      toast.success("Spam flag resolved");
    },
  });
}

export function useRunCleanup() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-cleanup");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Cleanup complete: ${JSON.stringify(data?.results || {})}`);
    },
  });
}

export function useRunAggregateStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("aggregate-stats");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Dashboard metrics refreshed");
    },
  });
}

export function useRunSpamDetection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("detect-spam");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["admin-spam-flags"] });
      toast.success(`Spam scan complete: ${data?.newFlags || 0} new flags`);
    },
  });
}

export function useMetricsTrend() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-metrics-trend"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("admin_metrics_daily")
        .select("*")
        .gte("metric_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("metric_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminRevenueData() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const [adsRes, subsRes, vouchersRes, claimedRes, eventsRes, regsRes, bookingsRes] = await Promise.all([
        supabase.from("ad_campaigns").select("id, spent, daily_budget, duration_days, total_budget, status, created_at, ad_type"),
        supabase.from("subscriptions").select("id, plan, billing_cycle, status, started_at, created_at"),
        supabase.from("vouchers").select("id, original_price, discounted_price, title, category, created_at"),
        supabase.from("claimed_vouchers").select("id, voucher_id, created_at, status"),
        supabase.from("events").select("id, title, price, is_free, created_at"),
        supabase.from("event_registrations").select("id, event_id, created_at"),
        supabase.from("bookings").select("id, business_id, status, created_at"),
      ]);

      const ads = adsRes.data ?? [];
      const subs = subsRes.data ?? [];
      const vouchers = vouchersRes.data ?? [];
      const claimed = claimedRes.data ?? [];
      const events = eventsRes.data ?? [];
      const regs = regsRes.data ?? [];
      const bookings = bookingsRes.data ?? [];

      // Ad revenue
      const totalAdSpent = ads.reduce((s, a) => s + (a.spent || 0), 0);
      const totalAdBudget = ads.reduce((s, a) => s + (a.total_budget || a.daily_budget * a.duration_days), 0);

      // Subscription revenue (estimated from plan pricing)
      const planPrices: Record<string, number> = { free: 0, basic: 499, premium: 1999, enterprise: 4999 };
      const activeSubs = subs.filter(s => s.status === "active");
      const monthlySubRevenue = activeSubs.reduce((s, sub) => {
        const price = planPrices[sub.plan] || 0;
        return s + (sub.billing_cycle === "yearly" ? price * 12 : price);
      }, 0);
      const subsByPlan = subs.reduce((acc, s) => {
        acc[s.plan] = (acc[s.plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Voucher revenue (commission estimate: platform takes ~10% of discounted price)
      const voucherMap = Object.fromEntries(vouchers.map(v => [v.id, v]));
      const voucherRevenue = claimed.reduce((s, c) => {
        const v = voucherMap[c.voucher_id];
        return s + (v ? v.discounted_price * 0.1 : 0);
      }, 0);

      // Event revenue (ticketed events, platform takes ~5%)
      const eventMap = Object.fromEntries(events.map(e => [e.id, e]));
      const eventRevenue = regs.reduce((s, r) => {
        const ev = eventMap[r.event_id];
        return s + (ev && !ev.is_free ? (ev.price || 0) * 0.05 : 0);
      }, 0);

      // Monthly breakdown (last 6 months)
      const monthCount = 12; // Fetch 12 months, filter in UI
      const now = new Date();
      const monthlyBreakdown = Array.from({ length: monthCount }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
        const monthStr = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });

        const monthAds = ads.filter(a => a.created_at.startsWith(monthStr)).reduce((s, a) => s + (a.spent || 0), 0);
        const monthSubs = subs.filter(s => s.created_at.startsWith(monthStr)).reduce((s, sub) => s + (planPrices[sub.plan] || 0), 0);
        const monthVouchers = claimed.filter(c => c.created_at.startsWith(monthStr)).reduce((s, c) => {
          const v = voucherMap[c.voucher_id];
          return s + (v ? v.discounted_price * 0.1 : 0);
        }, 0);
        const monthEvents = regs.filter(r => r.created_at.startsWith(monthStr)).reduce((s, r) => {
          const ev = eventMap[r.event_id];
          return s + (ev && !ev.is_free ? (ev.price || 0) * 0.05 : 0);
        }, 0);

        return { month: label, ads: monthAds, subscriptions: monthSubs, vouchers: monthVouchers, events: monthEvents, total: monthAds + monthSubs + monthVouchers + monthEvents };
      });

      // Ad type breakdown
      const adByType = ads.reduce((acc, a) => {
        acc[a.ad_type] = (acc[a.ad_type] || 0) + (a.spent || 0);
        return acc;
      }, {} as Record<string, number>);

      // Voucher category breakdown
      const voucherByCat = claimed.reduce((acc, c) => {
        const v = voucherMap[c.voucher_id];
        if (v) {
          const cat = v.category || "general";
          acc[cat] = (acc[cat] || 0) + v.discounted_price * 0.1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAdSpent,
        totalAdBudget,
        monthlySubRevenue,
        subsByPlan,
        activeSubs: activeSubs.length,
        totalSubs: subs.length,
        voucherRevenue,
        totalClaimed: claimed.length,
        eventRevenue,
        totalRegistrations: regs.length,
        totalBookings: bookings.length,
        totalRevenue: totalAdSpent + monthlySubRevenue + voucherRevenue + eventRevenue,
        monthlyBreakdown,
        adByType,
        voucherByCat,
        topVouchers: vouchers
          .map(v => ({ ...v, claims: claimed.filter(c => c.voucher_id === v.id).length }))
          .sort((a, b) => b.claims - a.claims)
          .slice(0, 5),
        topEvents: events
          .map(e => ({ ...e, registrations: regs.filter(r => r.event_id === e.id).length }))
          .sort((a, b) => b.registrations - a.registrations)
          .slice(0, 5),
      };
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminBusinessCards() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-business-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminEvents() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminVouchers() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminAds() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminReviews() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminSubscriptions() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminTickets() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminCategories() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminProfiles() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

export function useAdminUserRoles() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin,
  });
}

// Mutations
export function useUpdateBusinessApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("business_cards")
        .update({ approval_status: status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-business-cards"] });
      logAdminAction(user?.id, `business_${status}`, "business", id, `Business ${status}`);
      toast.success("Business status updated");
    },
  });
}

export function useUpdateEventApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("events")
        .update({ approval_status: status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      logAdminAction(user?.id, `event_${status}`, "event", id, `Event ${status}`);
      toast.success("Event status updated");
    },
  });
}

export function useUpdateAdApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({ approval_status: status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      logAdminAction(user?.id, `ad_${status}`, "ad", id, `Ad ${status}`);
      toast.success("Ad campaign status updated");
    },
  });
}

export function useUpdateVoucherApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("vouchers")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-vouchers"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-counts"] });
      logAdminAction(user?.id, `voucher_${status}`, "voucher", id, `Voucher ${status}`);
      toast.success("Voucher status updated");
    },
  });
}


export function useFlagReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, flagged }: { id: string; flagged: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_flagged: flagged } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review updated");
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Ticket updated");
    },
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { id?: string; name: string; emoji: string; sort_order: number; is_active: boolean }) => {
      if (cat.id) {
        const { error } = await supabase.from("platform_categories").update(cat as any).eq("id", cat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_categories").insert(cat as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category saved");
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category deleted");
    },
  });
}

export function useBroadcastNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userIds, title, description, emoji, type }: {
      userIds: string[];
      title: string;
      description?: string;
      emoji?: string;
      type?: string;
    }) => {
      const rows = userIds.map(uid => ({
        user_id: uid,
        title,
        description: description || null,
        emoji: emoji || "📢",
        type: type || "broadcast",
      }));
      const { error } = await supabase.from("notifications").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Notification broadcast sent! 📢");
    },
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: suspended } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id, suspended }) => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      logAdminAction(user?.id, suspended ? "user_suspended" : "user_activated", "user", id, suspended ? "User suspended" : "User activated");
      toast.success("User status updated");
    },
  });
}

export function useToggleBusinessVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase
        .from("business_cards")
        .update({ is_verified: verified } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      qc.invalidateQueries({ queryKey: ["admin-business-cards"] });
      toast.success(verified ? "Business verified! Premium badge activated." : "Verification removed.");
    },
  });
}

export function useAdminPendingCounts() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      const [cards, events, ads, vouchers, reports, disputes, tickets, reviews] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("ad_campaigns").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("vouchers").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("business_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_flagged", true),
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
