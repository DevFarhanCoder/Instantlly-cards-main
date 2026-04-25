import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../integrations/supabase/client";

const VISITOR_KEY = "instantly-visitor-id";

function generateId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `v_${Date.now().toString(36)}_${rand}`;
}

async function getVisitorId(): Promise<string> {
  const existing = await AsyncStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const id = generateId();
  await AsyncStorage.setItem(VISITOR_KEY, id);
  return id;
}

type AnalyticsEventType =
  | "view"
  | "phone_click"
  | "message_click"
  | "direction_click"
  | "website_click"
  | "share";

export async function trackCardEvent(
  businessCardId: string,
  eventType: AnalyticsEventType,
) {
  try {
    const visitorId = await getVisitorId();
    await supabase.from("card_analytics").insert({
      business_card_id: businessCardId,
      event_type: eventType,
      visitor_id: visitorId,
    });
  } catch {
    // Never block UI on analytics.
  }
}

/**
 * Promotion-first analytics event. Always writes promotion_id as the primary
 * scope. If a business card is linked, it is also recorded so legacy
 * card-centric queries keep working.
 */
export async function trackPromotionEvent(
  promotionId: number | string | null | undefined,
  eventType: AnalyticsEventType,
  businessCardId?: string | number | null,
) {
  if (!promotionId) return;
  try {
    const visitorId = await getVisitorId();
    const payload: Record<string, any> = {
      business_promotion_id: Number(promotionId),
      event_type: eventType,
      visitor_id: visitorId,
    };
    if (businessCardId) payload.business_card_id = businessCardId;
    await supabase.from("card_analytics").insert(payload);
  } catch {
    // Never block UI on analytics.
  }
}
