import { baseApi } from './baseApi';

export interface EventBusiness {
  id: number;
  company_name: string | null;
  logo_url: string | null;
  full_name: string;
  phone?: string;
}

export interface AppEvent {
  id: number;
  business_id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string | null;
  image_url: string | null;
  ticket_price: number | null;
  max_attendees: number | null;
  attendee_count: number;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  business?: EventBusiness;
  _count?: { registrations: number };
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  ticket_count: number;
  registered_at: string;
  qr_code?: string;
  event?: AppEvent;
  user?: { id: number; name: string; phone: string; profile_picture: string | null };
}

export interface CreateEventInput {
  business_id: number;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  image_url?: string;
  ticket_price?: number;
  max_attendees?: number;
}

export interface UpdateEventInput {
  id: number;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  image_url?: string;
  ticket_price?: number;
  max_attendees?: number;
  status?: string;
}

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listEvents: builder.query<
      { data: AppEvent[]; page: number; limit: number },
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) => {
        const { page = 1, limit = 20, search } = params || {};
        let url = `/events?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return url;
      },
      providesTags: ['Event'],
    }),
    getEvent: builder.query<AppEvent, number>({
      query: (id) => `/events/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Event', id }],
    }),
    listMyEvents: builder.query<AppEvent[], void>({
      query: () => '/events/my',
      providesTags: ['Event'],
    }),
    createEvent: builder.mutation<AppEvent, CreateEventInput>({
      query: (body) => ({ url: '/events', method: 'POST', body }),
      invalidatesTags: ['Event'],
    }),
    updateEvent: builder.mutation<AppEvent, UpdateEventInput>({
      query: ({ id, ...body }) => ({ url: `/events/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Event'],
    }),
    registerForEvent: builder.mutation<
      EventRegistration & { qr_code: string },
      { eventId: number; ticket_count?: number }
    >({
      query: ({ eventId, ticket_count }) => ({
        url: `/events/${eventId}/register`,
        method: 'POST',
        body: { ticket_count },
      }),
      invalidatesTags: ['Event'],
    }),
    getEventRegistrations: builder.query<EventRegistration[], number>({
      query: (eventId) => `/events/${eventId}/registrations`,
      providesTags: ['Event'],
    }),
    getMyRegistrations: builder.query<EventRegistration[], void>({
      query: () => '/events/registrations/my',
      providesTags: ['Event'],
    }),
  }),
});

export const {
  useListEventsQuery,
  useGetEventQuery,
  useListMyEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useRegisterForEventMutation,
  useGetEventRegistrationsQuery,
  useGetMyRegistrationsQuery,
} = eventsApi;
