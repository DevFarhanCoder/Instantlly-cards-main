import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "customer" | "business" | "admin";

export function useUserRole() {
  const { user } = useAuth();

  const rolesQuery = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as AppRole);
    },
    enabled: !!user,
  });

  const roles = rolesQuery.data ?? [];

  return {
    roles,
    isLoading: rolesQuery.isLoading,
    isCustomer: roles.includes("customer"),
    isBusiness: roles.includes("business"),
    isAdmin: roles.includes("admin"),
  };
}
