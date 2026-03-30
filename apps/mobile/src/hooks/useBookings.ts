import {
  useListMyBookingsQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
  CreateBookingInput,
} from '../store/api/bookingsApi';
import { useAuth } from './useAuth';

export type { Booking, CreateBookingInput } from '../store/api/bookingsApi';

export function useBookings() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListMyBookingsQuery(
    { page: 1 },
    { skip: !user }
  );
  const [createBookingTrigger, createState] = useCreateBookingMutation();
  const [updateStatusTrigger] = useUpdateBookingStatusMutation();

  return {
    bookings: data?.data ?? [],
    isLoading,
    refetch,
    createBooking: (input: CreateBookingInput) => createBookingTrigger(input).unwrap(),
    isCreating: createState.isLoading,
    updateBookingStatus: (input: { id: number; status: string }) =>
      updateStatusTrigger(input).unwrap(),
  };
}
