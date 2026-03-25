import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, favoriteIds, location, recentCategories } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all approved business cards
    const { data: allCards, error } = await supabase
      .from("business_cards")
      .select("id, full_name, company_name, category, location, description, services, latitude, longitude, service_mode, logo_url")
      .eq("approval_status", "approved")
      .limit(100);

    if (error) throw error;

    // Build context for AI
    const favoritesList = favoriteIds?.length ? `User's favorite business IDs: ${favoriteIds.join(", ")}` : "No favorites yet.";
    const locationInfo = location ? `User location: lat ${location.lat}, lng ${location.lng}` : "Location unknown.";
    const categoriesInfo = recentCategories?.length ? `Recently browsed categories: ${recentCategories.join(", ")}` : "";

    const businessList = (allCards || []).map((c: any) =>
      `ID:${c.id} | ${c.full_name} | ${c.company_name || ""} | Category:${c.category || "general"} | Location:${c.location || "unknown"} | Services:${(c.services || []).join(",")} | Mode:${c.service_mode}`
    ).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a business recommendation engine. Given a user's favorites, location, and browsing history, recommend the 6 best businesses from the available list. Return ONLY a JSON array of objects with fields: id (business ID), reason (1-sentence why recommended). Prioritize relevance, variety, and proximity. Don't recommend businesses already in favorites.`,
          },
          {
            role: "user",
            content: `${favoritesList}\n${locationInfo}\n${categoriesInfo}\n\nAvailable businesses:\n${businessList}\n\nReturn JSON array of 6 recommendations.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_businesses",
              description: "Return business recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["id", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_businesses" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let recommendations: any[] = [];

    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      recommendations = parsed.recommendations || [];
    }

    // Enrich with full card data
    const recIds = recommendations.map((r: any) => r.id);
    const { data: recCards } = await supabase
      .from("business_cards")
      .select("*")
      .in("id", recIds);

    const enriched = recommendations.map((r: any) => ({
      ...r,
      card: (recCards || []).find((c: any) => c.id === r.id),
    })).filter((r: any) => r.card);

    return new Response(JSON.stringify({ recommendations: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Recommendation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
