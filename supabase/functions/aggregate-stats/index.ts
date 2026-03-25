import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today}T00:00:00.000Z`;

    // Parallel count queries
    const [
      businesses, events, vouchers, bookings, ads, reviews, subs, tickets,
      users, activeAds, activeSubs,
      pendingBiz, pendingEvents, pendingAds, pendingVouchers,
      openTickets, openDisputes, openReports, flaggedReviews,
      newUsersToday, newBookingsToday, newBizToday,
      adSpent, claimedVouchers, eventRegs, paidEvents
    ] = await Promise.all([
      supabase.from("business_cards").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("vouchers").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("ad_campaigns").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("ad_campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("business_cards").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("ad_campaigns").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("vouchers").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("business_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_flagged", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("business_cards").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("ad_campaigns").select("spent"),
      supabase.from("claimed_vouchers").select("voucher_id, status"),
      supabase.from("event_registrations").select("event_id"),
      supabase.from("events").select("id, price, is_free"),
    ]);

    // Revenue calculations
    const totalAdSpent = (adSpent.data ?? []).reduce((s: number, a: any) => s + (a.spent || 0), 0);

    const planPrices: Record<string, number> = { free: 0, basic: 499, premium: 1999, enterprise: 4999 };
    const { data: activeSubsData } = await supabase.from("subscriptions").select("plan").eq("status", "active");
    const subRevenue = (activeSubsData ?? []).reduce((s: number, sub: any) => s + (planPrices[sub.plan] || 0), 0);

    // Voucher revenue (10% commission)
    const { data: voucherPrices } = await supabase.from("vouchers").select("id, discounted_price");
    const voucherMap = Object.fromEntries((voucherPrices ?? []).map((v: any) => [v.id, v.discounted_price]));
    const voucherRevenue = (claimedVouchers.data ?? []).reduce((s: number, c: any) => {
      return s + (voucherMap[c.voucher_id] || 0) * 0.1;
    }, 0);

    // Event revenue (5% commission on paid events)
    const eventMap = Object.fromEntries((paidEvents.data ?? []).map((e: any) => [e.id, e]));
    const eventRevenue = (eventRegs.data ?? []).reduce((s: number, r: any) => {
      const ev = eventMap[r.event_id];
      return s + (ev && !ev.is_free ? (ev.price || 0) * 0.05 : 0);
    }, 0);

    const metrics = {
      metric_date: today,
      total_businesses: businesses.count ?? 0,
      total_events: events.count ?? 0,
      total_vouchers: vouchers.count ?? 0,
      total_bookings: bookings.count ?? 0,
      total_ads: ads.count ?? 0,
      total_reviews: reviews.count ?? 0,
      total_subscriptions: subs.count ?? 0,
      total_tickets: tickets.count ?? 0,
      total_users: users.count ?? 0,
      active_ads: activeAds.count ?? 0,
      active_subscriptions: activeSubs.count ?? 0,
      pending_businesses: pendingBiz.count ?? 0,
      pending_events: pendingEvents.count ?? 0,
      pending_ads: pendingAds.count ?? 0,
      pending_vouchers: pendingVouchers.count ?? 0,
      open_tickets: openTickets.count ?? 0,
      open_disputes: openDisputes.count ?? 0,
      open_reports: openReports.count ?? 0,
      flagged_reviews: flaggedReviews.count ?? 0,
      new_users_today: newUsersToday.count ?? 0,
      new_bookings_today: newBookingsToday.count ?? 0,
      new_businesses_today: newBizToday.count ?? 0,
      revenue_ads: totalAdSpent,
      revenue_subscriptions: subRevenue,
      revenue_vouchers: voucherRevenue,
      revenue_events: eventRevenue,
    };

    // Upsert (one row per day)
    const { error } = await supabase
      .from("admin_metrics_daily")
      .upsert(metrics, { onConflict: "metric_date" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
