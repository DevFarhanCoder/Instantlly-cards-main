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

    const results: Record<string, number> = {};

    // 1. Archive expired vouchers (mark as expired if past expires_at)
    const { data: expiredVouchers } = await supabase
      .from("vouchers")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null)
      .select("id");
    results.expired_vouchers = expiredVouchers?.length ?? 0;

    // 2. Archive expired claimed vouchers
    const { data: expiredClaimed } = await supabase
      .from("claimed_vouchers")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("redeemed_at", null)
      .select("id");
    // Get voucher IDs for claimed vouchers whose parent voucher expired
    if (expiredVouchers && expiredVouchers.length > 0) {
      const expiredIds = expiredVouchers.map((v: any) => v.id);
      const { data: claimedExpired } = await supabase
        .from("claimed_vouchers")
        .update({ status: "expired" })
        .eq("status", "active")
        .in("voucher_id", expiredIds)
        .select("id");
      results.expired_claimed_vouchers = claimedExpired?.length ?? 0;
    }

    // 3. Prune old notifications (>90 days, already read)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: prunedNotifications } = await supabase
      .from("notifications")
      .delete()
      .eq("read", true)
      .lt("created_at", ninetyDaysAgo.toISOString())
      .select("id");
    results.pruned_notifications = prunedNotifications?.length ?? 0;

    // 4. Prune old activity logs (>180 days)
    const oneEightyDaysAgo = new Date();
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
    const { data: prunedLogs } = await supabase
      .from("activity_logs")
      .delete()
      .lt("created_at", oneEightyDaysAgo.toISOString())
      .select("id");
    results.pruned_activity_logs = prunedLogs?.length ?? 0;

    // 5. Mark stale leads (>30 days old, still 'new')
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: staleLeads } = await supabase
      .from("business_leads")
      .update({ status: "stale" })
      .eq("status", "new")
      .lt("created_at", thirtyDaysAgo.toISOString())
      .select("id");
    results.stale_leads = staleLeads?.length ?? 0;

    // 6. Auto-pause expired ad campaigns (backup for DB function)
    const { data: pausedAds } = await supabase
      .from("ad_campaigns")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("end_date", new Date().toISOString().split("T")[0])
      .not("end_date", "is", null)
      .select("id");
    results.paused_ads = pausedAds?.length ?? 0;

    // 7. Clean resolved spam flags older than 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const { data: cleanedFlags } = await supabase
      .from("spam_flags")
      .delete()
      .eq("is_resolved", true)
      .lt("created_at", sixtyDaysAgo.toISOString())
      .select("id");
    results.cleaned_spam_flags = cleanedFlags?.length ?? 0;

    // Log cleanup action
    await supabase.from("activity_logs").insert({
      event_type: "auto_cleanup",
      entity_type: "system",
      entity_id: "auto-cleanup",
      description: `Cleanup: ${JSON.stringify(results)}`,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
