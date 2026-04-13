import {
  useListEventsQuery,
  useGetEventQuery,
  useListMyEventsQuery,
  useCreateEventMutation,
  useCreateEventPaymentIntentMutation,
  useRegisterForEventMutation,
  useGetMyRegistrationsQuery,
  useVerifyRegistrationMutation,
} from '../store/api/eventsApi';
import { useAuth } from './useAuth';

export type {
  AppEvent as Event,
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
  const { data, isLoading, refetch } = useGetMyRegistrationsQuery(undefined, { skip: !user });
  return {
    registrations: data ?? [],
    isLoading,
    refetch,
  };
}
