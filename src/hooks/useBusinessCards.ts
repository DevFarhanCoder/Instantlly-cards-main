import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BusinessCardRow {
  id: string;
  user_id: string;
  full_name: string;
  birthdate: string | null;
  anniversary: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  location: string | null;
  maps_link: string | null;
  company_name: string | null;
  job_title: string | null;
  company_phone: string | null;
  company_email: string | null;
  website: string | null;
  company_address: string | null;
  company_maps_link: string | null;
  logo_url: string | null;
  description: string | null;
  business_hours: string | null;
  category: string | null;
  established_year: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  keywords: string | null;
  offer: string | null;
  services: string[];
  created_at: string;
  updated_at: string;
}

export const useBusinessCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["business-cards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as BusinessCardRow[];
    },
    enabled: !!user,
  });

  const createCard = useMutation({
    mutationFn: async (card: Omit<BusinessCardRow, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("business_cards" as any)
        .insert({ ...card, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BusinessCardRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card created!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create card"),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...card }: Partial<BusinessCardRow> & { id: string }) => {
      const { data, error } = await supabase
        .from("business_cards" as any)
        .update(card as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BusinessCardRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card updated!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update card"),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_cards" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Card deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete card"),
  });

  return { cards, isLoading, createCard, updateCard, deleteCard };
};
