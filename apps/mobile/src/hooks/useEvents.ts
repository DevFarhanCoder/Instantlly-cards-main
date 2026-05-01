import {
  useListEventsQuery,
  useGetEventQuery,
  useListMyEventsQuery,
  useCreateEventMutation,
  useCreateEventPaymentIntentMutation,
  useRegisterForEventMutation,
  useGetMyRegistrationsQuery,
  useVerifyRegistrationMutation,
  useJoinEventWaitlistMutation,
  useCancelEventMutation,
  useRefundRegistrationMutation,
  usePromoteWaitlistMutation,
} from '../store/api/eventsApi';
import { useAuth } from './useAuth';

export type {
  AppEvent as Event,
  AppTicketTier as TicketTier,
  EventRegistration,
  CreateEventInput,
  UpdateEventInput,
} from '../store/api/eventsApi';

export function useEvents() {
  const { data, isLoading, isFetching, refetch } = useListEventsQuery(undefined, { refetchOnMountOrArgChange: true });
  return {
    data: data?.data ?? [],
    isLoading,
    isFetching,
    refetch,
  };
}

export function useEvent(id: string | number) {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return useGetEventQuery(numId, { skip: !numId || isNaN(numId) });
}

export function useMyEvents() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListMyEventsQuery(undefined, { skip: !user });
  return {
    data: data ?? [],
    isLoading,
    refetch,
  };
}

export function useCreateEvent() {
  const [trigger, state] = useCreateEventMutation();
  return {
    mutateAsync: (input: import('../store/api/eventsApi').CreateEventInput) =>
      trigger(input).unwrap(),
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,
  };
}

export function useRegisterForEvent() {
  const [trigger, state] = useRegisterForEventMutation();
  return {
    mutateAsync: async (input: {
      event_id: string | number;
      full_name?: string;
      email?: string;
      phone?: string;
      ticket_count?: number;
      tier_id?: number | null;
      payment?: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      };
    }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      const result = await trigger({
        eventId,
        ticket_count: input.ticket_count,
        tier_id: input.tier_id ?? undefined,
        payment: input.payment,
      }).unwrap();
      return result;
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    data: state.data,
    error: state.error,
  };
}

export function useCreateEventPaymentIntent() {
  const [trigger, state] = useCreateEventPaymentIntentMutation();
  return {
    mutateAsync: (input: { event_id: string | number; ticket_count?: number; tier_id?: number | null }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      return trigger({ eventId, ticket_count: input.ticket_count, tier_id: input.tier_id ?? undefined }).unwrap();
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    data: state.data,
    error: state.error,
  };
}

/** Phase 5 — Join the waitlist when an event is full. */
export function useJoinWaitlist() {
  const [trigger, state] = useJoinEventWaitlistMutation();
  return {
    mutateAsync: (input: { event_id: string | number; ticket_count?: number }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      return trigger({ eventId, ticket_count: input.ticket_count }).unwrap();
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    data: state.data,
    error: state.error,
  };
}

export function useVerifyRegistration() {
  const [trigger, state] = useVerifyRegistrationMutation();
  return {
    mutateAsync: (qr_code: string) => trigger(qr_code).unwrap(),
    isPending: state.isLoading,
  };
}

export function useMyRegistrations() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useGetMyRegistrationsQuery(undefined, {
    skip: !user,
    // Use cached data when navigating to QRView — avoids full reload on every mount.
    refetchOnMountOrArgChange: false,
  });
  return {
    registrations: data ?? [],
    isLoading,
    isError,
    refetch,
  };
}

/** Phase 5 — Organizer cancels an event (cascades refunds server-side). */
export function useCancelEvent() {
  const [trigger, state] = useCancelEventMutation();
  return {
    mutateAsync: (input: { event_id: string | number; reason?: string }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      return trigger({ eventId, reason: input.reason }).unwrap();
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,
  };
}

/** Phase 5 — Organizer refunds a single registration. */
export function useRefundRegistration() {
  const [trigger, state] = useRefundRegistrationMutation();
  return {
    mutateAsync: (input: {
      event_id: string | number;
      registration_id: number;
      reason?: string;
    }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      return trigger({
        eventId,
        registrationId: input.registration_id,
        reason: input.reason,
      }).unwrap();
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    error: state.error,
  };
}

/** Phase 5 — Organizer manually promotes the next waitlisted user. */
export function usePromoteWaitlist() {
  const [trigger, state] = usePromoteWaitlistMutation();
  return {
    mutateAsync: (input: { event_id: string | number }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      return trigger({ eventId }).unwrap();
    },
    isPending: state.isLoading,
  };
}
