import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find bookings happening tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", tomorrowStr)
      .eq("status", "confirmed");

    if (error) throw error;

    let sent = 0;
    for (const booking of bookings || []) {
      // Notify the customer
      await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "📅 Appointment Reminder",
        description: `Your appointment with ${booking.business_name} is tomorrow at ${booking.booking_time || "scheduled time"}`,
        emoji: "⏰",
        type: "booking",
      });
      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
