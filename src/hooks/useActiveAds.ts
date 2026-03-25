import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useEffect, useRef } from "react";

export interface ActiveAd {
  id: string;
  title: string;
  description: string | null;
  ad_type: string;
  cta: string | null;
  creative_url: string | null;
  creative_urls: string[];
  target_city: string | null;
  business_card_id: string | null;
  status: string;
  daily_budget: number;
  total_budget: number | null;
  spent: number;
  impressions: number;
  clicks: number;
}

export interface ActiveAdVariant {
  id: string;
  campaign_id: string;
  creative_url: string;
  label: string;
  impressions: number;
  clicks: number;
}

// Reverse geocode city from coordinates using Nominatim
async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
    );
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.district ||
      data.address?.state_district ||
      null
    );
  } catch {
    return null;
  }
}

export function useActiveAds(adType?: string) {
  const userLocation = useUserLocation();

  return useQuery({
    queryKey: ["active-ads", adType],
    queryFn: async () => {
      let query = supabase
        .from("ad_campaigns")
        .select("*")
        .eq("status", "active")
        .eq("approval_status", "approved")
        .gte("end_date", new Date().toISOString().split("T")[0]);

      if (adType) {
        query = query.eq("ad_type", adType);
      }

      const { data, error } = await query;
      if (error) throw error;

      let ads = (data || []) as unknown as ActiveAd[];

      // Geo-filter: if user location is available, filter by city match
      if (userLocation) {
        const userCity = await reverseGeocodeCity(userLocation.latitude, userLocation.longitude);
        if (userCity) {
          ads = ads.filter(
            (ad) =>
              !ad.target_city ||
              ad.target_city.toLowerCase().includes(userCity.toLowerCase()) ||
              userCity.toLowerCase().includes(ad.target_city.toLowerCase())
          );
        }
      }

      return ads;
    },
    staleTime: 60_000,
  });
}

export function useAdVariants(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["ad-variants", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_variants")
        .select("*")
        .eq("campaign_id", campaignId!);
      if (error) throw error;
      return data as unknown as ActiveAdVariant[];
    },
    enabled: !!campaignId,
  });
}

// Track impressions — only once per ad per session
const impressionSet = new Set<string>();

export function useRecordImpression(campaignId: string | undefined, variantId?: string) {
  const recorded = useRef(false);

  useEffect(() => {
    if (!campaignId || recorded.current || impressionSet.has(campaignId)) return;
    recorded.current = true;
    impressionSet.add(campaignId);

    supabase.rpc("record_ad_impression", {
      p_campaign_id: campaignId,
      p_variant_id: variantId || null,
    });
  }, [campaignId, variantId]);
}

export async function recordAdClick(campaignId: string, variantId?: string) {
  await supabase.rpc("record_ad_click", {
    p_campaign_id: campaignId,
    p_variant_id: variantId || null,
  });
}
