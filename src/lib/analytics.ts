import { supabase } from "@/integrations/supabase/client";

// Generate a simple anonymous visitor ID
function getVisitorId(): string {
  let id = localStorage.getItem("instantly-visitor-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("instantly-visitor-id", id);
  }
  return id;
}

export async function trackCardEvent(
  businessCardId: string,
  eventType: "view" | "phone_click" | "message_click" | "direction_click" | "website_click" | "share"
) {
  try {
    await supabase.from("card_analytics").insert({
      business_card_id: businessCardId,
      event_type: eventType,
      visitor_id: getVisitorId(),
    });
  } catch {
    // Silent fail - analytics should never block UX
  }
}
