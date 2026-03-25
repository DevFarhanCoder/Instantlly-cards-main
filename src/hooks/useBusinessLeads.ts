import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useBusinessLeads = (businessCardId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["business-leads", businessCardId],
    queryFn: async () => {
      if (!businessCardId) return [];
      const { data, error } = await supabase
        .from("business_leads" as any)
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!businessCardId,
  });

  const submitLead = useMutation({
    mutationFn: async (lead: {
      business_card_id: string;
      full_name: string;
      email?: string;
      phone?: string;
      message?: string;
      source?: string;
    }) => {
      const { error } = await supabase.from("business_leads" as any).insert(lead);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your inquiry has been sent!");
    },
    onError: () => {
      toast.error("Failed to send inquiry");
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("business_leads" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-leads"] });
      toast.success("Lead status updated!");
    },
  });

  return { leads, isLoading, submitLead, updateLeadStatus };
};
