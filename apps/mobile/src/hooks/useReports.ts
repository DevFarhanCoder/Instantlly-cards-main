import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, SUPABASE_CONFIG_OK } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useReportBusiness() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: { business_id: string; reason: string; details?: string }) => {
      if (!SUPABASE_CONFIG_OK) throw new Error("Reports are not configured yet.");
      const { data, error } = await supabase
        .from("business_reports")
        .insert({ ...report, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-reports"] }),
  });
}

export function useDisputes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const disputesQuery = useQuery({
    queryKey: ["my-disputes", user?.id],
    queryFn: async () => {
      if (!SUPABASE_CONFIG_OK) return [];
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: SUPABASE_CONFIG_OK && !!user,
  });

  const createDispute = useMutation({
    mutationFn: async (dispute: {
      dispute_type: string;
      reference_id: string;
      business_id: string;
      description: string;
    }) => {
      if (!SUPABASE_CONFIG_OK) throw new Error("Disputes are not configured yet.");
      const { data, error } = await supabase
        .from("disputes")
        .insert({ ...dispute, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-disputes"] }),
  });

  return {
    disputes: disputesQuery.data ?? [],
    isLoading: disputesQuery.isLoading,
    createDispute,
  };
}
