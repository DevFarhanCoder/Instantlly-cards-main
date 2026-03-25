import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StaffMember {
  id: string;
  business_card_id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  permissions: string[];
  created_at: string;
}

export function useBusinessStaff(businessCardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["business-staff", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_staff")
        .select("*")
        .eq("business_card_id", businessCardId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!businessCardId && !!user,
  });

  const addStaff = useMutation({
    mutationFn: async (staff: { name: string; email?: string; role: string }) => {
      const { data, error } = await supabase
        .from("business_staff")
        .insert({
          business_card_id: businessCardId!,
          user_id: user!.id,
          name: staff.name,
          email: staff.email || null,
          role: staff.role,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-staff", businessCardId] }),
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business-staff", businessCardId] }),
  });

  return {
    staff: staffQuery.data ?? [],
    isLoading: staffQuery.isLoading,
    addStaff,
    removeStaff,
  };
}
