import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "../lib/toast";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  date: string;
  time: string;
  category: string;
  image_url: string | null;
  price: number;
  is_free: boolean;
  max_attendees: number | null;
  organizer_name: string | null;
  is_featured: boolean;
  user_id: string | null;
  business_card_id: string | null;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  qr_code: string;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Event;
    },
    enabled: !!id,
  });
}

export function useMyEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!user,
  });
}

export function useCreateEvent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: {
      title: string;
      description?: string;
      venue: string;
      date: string;
      time: string;
      category: string;
      price?: number;
      is_free?: boolean;
      max_attendees?: number;
      business_card_id?: string;
      organizer_name?: string;
    }) => {
      const { data, error } = await supabase
        .from("events")
        .insert({
          ...event,
          user_id: user!.id,
          organizer_name:
            event.organizer_name || user!.user_metadata?.full_name || "Organizer",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      toast.success("Event created! 🎉");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create event"),
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registration: {
      event_id: string;
      full_name: string;
      email: string;
      phone?: string;
    }) => {
      const qr_code = `EVT-${registration.event_id.slice(
        0,
        8
      )}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase
        .from("event_registrations")
        .insert({ ...registration, qr_code })
        .select()
        .single();
      if (error) throw error;
      return data as EventRegistration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useVerifyRegistration() {
  return useMutation({
    mutationFn: async (qr_code: string) => {
      const { data: reg, error: findError } = await supabase
        .from("event_registrations")
        .select("*, events(*)")
        .eq("qr_code", qr_code)
        .single();
      if (findError) throw new Error("Registration not found");
      if (reg.is_verified) throw new Error("Already verified");

      const { error: updateError } = await supabase
        .from("event_registrations")
        .update({ is_verified: true, verified_at: new Date().toISOString() })
        .eq("qr_code", qr_code);
      if (updateError) throw updateError;

      return reg;
    },
  });
}
