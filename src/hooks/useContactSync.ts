import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Normalize phone: keep only digits, take last 10
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

// Check if Contact Picker API is available
export function isContactPickerSupported(): boolean {
  return "contacts" in navigator && "ContactsManager" in window;
}

export interface SyncedContact {
  phone_number: string;
  contact_name: string | null;
}

export function useNetworkCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["network-cards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_network_cards", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });
}

export function useSyncedContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["synced-contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("synced_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSyncContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: SyncedContact[]) => {
      if (!user) throw new Error("Must be signed in");

      // Deduplicate by normalized phone
      const seen = new Set<string>();
      const unique = contacts.filter((c) => {
        const norm = normalizePhone(c.phone_number);
        if (norm.length < 10 || seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });

      if (unique.length === 0) return 0;

      // Upsert contacts (ignore conflicts)
      const rows = unique.map((c) => ({
        user_id: user.id,
        phone_number: normalizePhone(c.phone_number),
        contact_name: c.contact_name || null,
      }));

      const { error } = await supabase
        .from("synced_contacts")
        .upsert(rows as any, { onConflict: "user_id,phone_number", ignoreDuplicates: true });

      if (error) throw error;
      return unique.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["synced-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["network-cards"] });
      if (count && count > 0) {
        toast.success(`${count} contacts synced! 📇`);
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to sync contacts"),
  });
}

// Use Contact Picker API (Android Chrome)
export async function pickContacts(): Promise<SyncedContact[]> {
  try {
    const contacts = await (navigator as any).contacts.select(
      ["name", "tel"],
      { multiple: true }
    );
    const result: SyncedContact[] = [];
    for (const contact of contacts) {
      const name = contact.name?.[0] || null;
      for (const tel of contact.tel || []) {
        result.push({ phone_number: tel, contact_name: name });
      }
    }
    return result;
  } catch {
    return [];
  }
}
