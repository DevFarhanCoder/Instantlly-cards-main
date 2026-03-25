import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const demoUsers = [
    { email: "customer@demo.com", password: "demo1234", role: "customer", name: "Demo Customer" },
    { email: "business@demo.com", password: "demo1234", role: "business", name: "Demo Business" },
    { email: "admin@demo.com", password: "demo1234", role: "admin", name: "Demo Admin" },
  ];

  const results = [];

  for (const demo of demoUsers) {
    let userId: string;

    // Check if user exists via admin API
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users.find(u => u.email === demo.email);

    if (existing) {
      userId = existing.id;
      results.push({ email: demo.email, status: "already_exists", userId });
    } else {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demo.email,
        password: demo.password,
        email_confirm: true,
        user_metadata: { full_name: demo.name },
      });

      if (createError) {
        results.push({ email: demo.email, status: "error", error: createError.message });
        continue;
      }

      userId = createData.user.id;
      results.push({ email: demo.email, status: "created", userId });
    }

    // Ensure role exists
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: demo.role }, { onConflict: "user_id,role" });

    if (roleError) {
      results.push({ email: demo.email, roleStatus: "role_error", error: roleError.message });
    }

    // For business demo, create a sample business card if none exists
    if (demo.role === "business") {
      const { data: existingCards } = await supabaseAdmin
        .from("business_cards")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (!existingCards || existingCards.length === 0) {
        const { data: bizCard } = await supabaseAdmin.from("business_cards").insert({
          user_id: userId,
          full_name: "Demo Business",
          phone: "+1234567890",
          company_name: "Demo Shop",
          category: "Shopping",
          location: "Demo City",
          description: "A demo business for testing purposes",
          approval_status: "approved",
        }).select("id").single();

        if (bizCard) {
          // Add sample services
          await supabaseAdmin.from("service_pricing").insert([
            { business_card_id: bizCard.id, user_id: userId, service_name: "Consultation", price: 500, duration: "30 min" },
            { business_card_id: bizCard.id, user_id: userId, service_name: "Premium Service", price: 1500, duration: "1 hour" },
          ]);
          // Add sample voucher
          await supabaseAdmin.from("vouchers").insert({
            user_id: userId,
            business_card_id: bizCard.id,
            title: "20% Off First Visit",
            subtitle: "Demo Shop",
            category: "Shopping",
            original_price: 1000,
            discounted_price: 800,
            discount_label: "20% OFF",
            status: "active",
          });
          // Add sample event
          await supabaseAdmin.from("events").insert({
            user_id: userId,
            business_card_id: bizCard.id,
            title: "Grand Opening Event",
            venue: "Demo City Center",
            date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            time: "18:00",
            category: "Networking",
            description: "Join us for the grand opening!",
            is_free: true,
            approval_status: "approved",
          });
        }
      }
    }

    // For customer demo, seed sample data
    if (demo.role === "customer") {
      // Check if already seeded
      const { count } = await supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (!count || count === 0) {
        // Get a business card to reference
        const { data: biz } = await supabaseAdmin.from("business_cards").select("id, company_name").limit(1).single();
        if (biz) {
          // Sample bookings
          await supabaseAdmin.from("bookings").insert([
            { user_id: userId, business_id: biz.id, business_name: biz.company_name || "Demo Shop", customer_name: "Demo Customer", customer_phone: "+1234567890", status: "confirmed", mode: "scheduled", booking_date: new Date().toISOString().split("T")[0], booking_time: "10:00" },
            { user_id: userId, business_id: biz.id, business_name: biz.company_name || "Demo Shop", customer_name: "Demo Customer", customer_phone: "+1234567890", status: "completed", mode: "scheduled", booking_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], booking_time: "14:00" },
            { user_id: userId, business_id: biz.id, business_name: biz.company_name || "Demo Shop", customer_name: "Demo Customer", customer_phone: "+1234567890", status: "cancelled", mode: "walk_in" },
          ]);
          // Sample claimed vouchers
          const { data: voucher } = await supabaseAdmin.from("vouchers").select("id").eq("status", "active").limit(1).single();
          if (voucher) {
            await supabaseAdmin.from("claimed_vouchers").insert([
              { user_id: userId, voucher_id: voucher.id, code: "DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase(), status: "active" },
              { user_id: userId, voucher_id: voucher.id, code: "DEMO-" + Math.random().toString(36).substring(2, 8).toUpperCase(), status: "active" },
            ]);
          }
          // Sample favorite
          await supabaseAdmin.from("favorites").insert({ user_id: userId, business_id: biz.id });
          // Sample notification
          await supabaseAdmin.from("notifications").insert({ user_id: userId, title: "Welcome to Instantly! 🎉", description: "Start exploring businesses near you.", type: "general", emoji: "👋" });
        }
      }
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
