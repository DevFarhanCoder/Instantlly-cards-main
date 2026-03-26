import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";

export interface BusinessLocation {
  id: string;
  business_card_id: string;
  user_id: string;
  branch_name: string;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  business_hours: string | null;
  is_primary: boolean;
  created_at: string;
}

export function useBusinessLocations(businessCardId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ["business-locations", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_locations" as any)
        .select("*")
        .eq("business_card_id", businessCardId!)
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return (data as any[]) as BusinessLocation[];
    },
    enabled: !!businessCardId,
  });

  const addLocation = useMutation({
    mutationFn: async (loc: Omit<BusinessLocation, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("business_locations" as any)
        .insert({ ...loc, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-locations", businessCardId] });
      toast.success("Branch added!");
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_locations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-locations", businessCardId] });
      toast.success("Branch removed");
    },
  });

  return {
    locations: locationsQuery.data ?? [],
    isLoading: locationsQuery.isLoading,
    addLocation,
    deleteLocation,
  };
}

