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

    const flags: any[] = [];

    // 1. Detect duplicate businesses (same phone number)
    const { data: allBusinesses } = await supabase
      .from("business_cards")
      .select("id, phone, full_name, company_name, company_address, user_id, created_at")
      .eq("approval_status", "approved");

    if (allBusinesses) {
      const phoneMap = new Map<string, any[]>();
      for (const biz of allBusinesses) {
        const cleanPhone = biz.phone.replace(/[^0-9]/g, "").slice(-10);
        if (cleanPhone.length >= 10) {
          if (!phoneMap.has(cleanPhone)) phoneMap.set(cleanPhone, []);
          phoneMap.get(cleanPhone)!.push(biz);
        }
      }

      for (const [phone, dupes] of phoneMap) {
        if (dupes.length > 1) {
          // Only flag if not already flagged
          for (const dupe of dupes.slice(1)) {
            const { data: existing } = await supabase
              .from("spam_flags")
              .select("id")
              .eq("entity_id", dupe.id)
              .eq("flag_type", "duplicate_business")
              .eq("is_resolved", false)
              .maybeSingle();

            if (!existing) {
              flags.push({
                flag_type: "duplicate_business",
                entity_type: "business_card",
                entity_id: dupe.id,
                reason: `Duplicate phone (${phone}) — matches "${dupes[0].full_name}" (${dupes[0].id})`,
                severity: "high",
              });
            }
          }
        }
      }

      // Detect same address duplicates
      const addrMap = new Map<string, any[]>();
      for (const biz of allBusinesses) {
        if (biz.company_address) {
          const cleanAddr = biz.company_address.toLowerCase().replace(/\s+/g, " ").trim();
          if (cleanAddr.length > 10) {
            if (!addrMap.has(cleanAddr)) addrMap.set(cleanAddr, []);
            addrMap.get(cleanAddr)!.push(biz);
          }
        }
      }

      for (const [addr, dupes] of addrMap) {
        if (dupes.length > 1) {
          for (const dupe of dupes.slice(1)) {
            const { data: existing } = await supabase
              .from("spam_flags")
              .select("id")
              .eq("entity_id", dupe.id)
              .eq("flag_type", "duplicate_business")
              .eq("is_resolved", false)
              .maybeSingle();

            if (!existing) {
              flags.push({
                flag_type: "duplicate_business",
                entity_type: "business_card",
                entity_id: dupe.id,
                reason: `Duplicate address — matches "${dupes[0].full_name}" at same location`,
                severity: "medium",
              });
            }
          }
        }
      }
    }

    // 2. Detect review spam (same user, 3+ reviews in 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const { data: recentReviews } = await supabase
      .from("reviews")
      .select("id, user_id, business_id, rating, created_at")
      .gte("created_at", oneDayAgo.toISOString());

    if (recentReviews) {
      const userReviewMap = new Map<string, any[]>();
      for (const review of recentReviews) {
        if (!userReviewMap.has(review.user_id)) userReviewMap.set(review.user_id, []);
        userReviewMap.get(review.user_id)!.push(review);
      }

      for (const [userId, reviews] of userReviewMap) {
        if (reviews.length >= 3) {
          // Check if all low ratings (potential spam attack)
          const avgRating = reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length;
          const severity = avgRating <= 2 ? "high" : "medium";

          for (const review of reviews) {
            const { data: existing } = await supabase
              .from("spam_flags")
              .select("id")
              .eq("entity_id", review.id)
              .eq("flag_type", "review_spam")
              .eq("is_resolved", false)
              .maybeSingle();

            if (!existing) {
              flags.push({
                flag_type: "review_spam",
                entity_type: "review",
                entity_id: review.id,
                reason: `User ${userId} posted ${reviews.length} reviews in 24h (avg rating: ${avgRating.toFixed(1)})`,
                severity,
              });
            }
          }
        }
      }
    }

    // 3. Detect suspicious signups (multiple accounts from same pattern)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const { data: recentProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, created_at")
      .gte("created_at", threeDaysAgo.toISOString());

    if (recentProfiles) {
      // Check for same phone across multiple profiles
      const phoneProfileMap = new Map<string, any[]>();
      for (const profile of recentProfiles) {
        if (profile.phone) {
          const cleanPhone = profile.phone.replace(/[^0-9]/g, "").slice(-10);
          if (cleanPhone.length >= 10) {
            if (!phoneProfileMap.has(cleanPhone)) phoneProfileMap.set(cleanPhone, []);
            phoneProfileMap.get(cleanPhone)!.push(profile);
          }
        }
      }

      for (const [phone, profiles] of phoneProfileMap) {
        if (profiles.length > 1) {
          for (const profile of profiles.slice(1)) {
            const { data: existing } = await supabase
              .from("spam_flags")
              .select("id")
              .eq("entity_id", profile.id)
              .eq("flag_type", "suspicious_signup")
              .eq("is_resolved", false)
              .maybeSingle();

            if (!existing) {
              flags.push({
                flag_type: "suspicious_signup",
                entity_type: "profile",
                entity_id: profile.id,
                reason: `Multiple accounts with phone ${phone} created in last 3 days`,
                severity: "high",
              });
            }
          }
        }
      }
    }

    // Insert all new flags
    if (flags.length > 0) {
      await supabase.from("spam_flags").insert(flags);
    }

    // Log detection run
    await supabase.from("activity_logs").insert({
      event_type: "spam_detection",
      entity_type: "system",
      entity_id: "detect-spam",
      description: `Spam scan: ${flags.length} new flags`,
    });

    return new Response(JSON.stringify({ success: true, newFlags: flags.length, flags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
