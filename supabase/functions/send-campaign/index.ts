import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target users based on audience
    let userQuery = supabase.from("profiles").select("id");
    
    if (campaign.target_audience === "business_owners") {
      const { data: bizUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "business");
      const bizIds = (bizUsers || []).map((u: any) => u.user_id);
      if (bizIds.length > 0) {
        userQuery = userQuery.in("id", bizIds);
      }
    } else if (campaign.target_audience === "customers") {
      const { data: custUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");
      const custIds = (custUsers || []).map((u: any) => u.user_id);
      if (custIds.length > 0) {
        userQuery = userQuery.in("id", custIds);
      }
    }

    const { data: users } = await userQuery;
    const userIds = (users || []).map((u: any) => u.id);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create notifications for all target users
    const notifications = userIds.map((uid: string) => ({
      user_id: uid,
      title: campaign.title,
      description: campaign.body || null,
      emoji: campaign.campaign_type === "voucher_blast" ? "🎟️" : campaign.campaign_type === "announcement" ? "📢" : "🔔",
      type: "campaign",
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifErr) throw notifErr;

    // Update campaign status and sent count
    await supabase
      .from("campaigns")
      .update({ status: "sent", sent_count: userIds.length })
      .eq("id", campaign_id);

    return new Response(JSON.stringify({ sent: userIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
