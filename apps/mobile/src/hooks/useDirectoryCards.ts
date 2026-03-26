import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

export interface DirectoryCard {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  location: string | null;
  company_name: string | null;
  job_title: string | null;
  logo_url: string | null;
  description: string | null;
  category: string | null;
  services: string[];
  offer: string | null;
  website: string | null;
  business_hours: string | null;
  established_year: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_address: string | null;
  company_maps_link: string | null;
  maps_link: string | null;
  keywords: string | null;
  gender: string | null;
  birthdate: string | null;
  anniversary: string | null;
  latitude: number | null;
  longitude: number | null;
  home_service: boolean;
  service_mode: string | null;
  whatsapp: string | null;
  telegram: string | null;
  is_verified: boolean;
  created_at: string;
}

export function useDirectoryCards() {
  return useQuery({
    queryKey: ["directory-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as DirectoryCard[];
    },
  });
}

export function useDirectoryCard(id: string) {
  return useQuery({
    queryKey: ["directory-card", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as DirectoryCard;
    },
    enabled: !!id,
  });
}

export function useDirectoryCardsByCategory(category: string | undefined) {
  return useQuery({
    queryKey: ["directory-cards-category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .ilike("category", `%${category}%`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as DirectoryCard[];
    },
    enabled: !!category,
  });
}
