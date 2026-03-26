import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Booking {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string;
  mode: string;
  booking_date: string | null;
  booking_time: string | null;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: string;
  created_at: string;
}

export function useBookings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!user,
  });

  const createBooking = useMutation({
    mutationFn: async (booking: {
      business_id: string;
      business_name: string;
      mode: string;
      booking_date?: string;
      booking_time?: string;
      customer_name: string;
      customer_phone: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...booking, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    createBooking,
  };
}
