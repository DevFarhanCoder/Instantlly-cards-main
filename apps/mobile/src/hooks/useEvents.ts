import {
  useListEventsQuery,
  useGetEventQuery,
  useListMyEventsQuery,
  useCreateEventMutation,
  useRegisterForEventMutation,
  useGetMyRegistrationsQuery,
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
    }) => {
      const eventId = typeof input.event_id === 'string' ? parseInt(input.event_id, 10) : input.event_id;
      const result = await trigger({ eventId, ticket_count: input.ticket_count }).unwrap();
      return result;
    },
    isPending: state.isLoading,
    isSuccess: state.isSuccess,
    data: state.data,
    error: state.error,
  };
}

export function useVerifyRegistration() {
  // TODO: Add backend verify endpoint. For now, return a stub.
  return {
    mutateAsync: async (_qr_code: string) => {
      throw new Error('Verify endpoint not yet implemented on Express backend');
    },
    isPending: false,
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
