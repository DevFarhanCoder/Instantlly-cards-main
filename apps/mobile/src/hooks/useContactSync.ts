import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Contacts from "expo-contacts";
import { supabase, SUPABASE_CONFIG_OK } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

export function isContactPickerSupported(): boolean {
  return true;
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
      if (!SUPABASE_CONFIG_OK) return [];
      const { data, error } = await supabase.rpc("get_network_cards", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as any[];
    },
    enabled: SUPABASE_CONFIG_OK && !!user,
  });
}

export function useSyncedContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["synced-contacts", user?.id],
    queryFn: async () => {
      if (!SUPABASE_CONFIG_OK) return [];
      const { data, error } = await supabase
        .from("synced_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: SUPABASE_CONFIG_OK && !!user,
  });
}

export function useSyncContacts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contacts: SyncedContact[]) => {
      if (!user) throw new Error("Must be signed in");

      const seen = new Set<string>();
      const unique = contacts.filter((c) => {
        const norm = normalizePhone(c.phone_number);
        if (norm.length < 10 || seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });

      if (unique.length === 0) return 0;

      const rows = unique.map((c) => ({
        user_id: user.id,
        phone_number: normalizePhone(c.phone_number),
        contact_name: c.contact_name || null,
      }));

      const { error } = await supabase
        .from("synced_contacts")
        .upsert(rows as any, {
          onConflict: "user_id,phone_number",
          ignoreDuplicates: true,
        });

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

export async function pickContacts(): Promise<SyncedContact[]> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== Contacts.PermissionStatus.GRANTED) return [];

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  const result: SyncedContact[] = [];
  data.forEach((contact) => {
    const name = contact.name ?? null;
    contact.phoneNumbers?.forEach((phone) => {
      if (phone.number) {
        result.push({ phone_number: phone.number, contact_name: name });
      }
    });
  });

  return result;
}
