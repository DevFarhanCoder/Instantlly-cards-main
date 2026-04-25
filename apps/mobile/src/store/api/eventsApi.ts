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
  business_id?: number | null;
  business_promotion_id: number;
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
  business_promotion?: { id: number; business_name: string; business_card_id: number | null };
  _count?: { registrations: number };
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  ticket_count: number;
  registered_at: string;
  qr_code?: string;
  payment_status?: string;
  payment_order_id?: string | null;
  payment_id?: string | null;
  amount_paid?: number | null;
  event?: AppEvent;
  user?: { id: number; name: string; phone: string; profile_picture: string | null };
}

export interface EventPaymentIntent {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  event_id: number;
  event_title: string;
  ticket_count: number;
  unit_price: number;
}

export interface EventPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CreateEventInput {
  business_promotion_id: number;
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
        console.log('[eventsApi.listEvents] url:', url);
        return url;
      },
      transformResponse: (response: { data: AppEvent[]; page: number; limit: number }) => {
        console.log('[eventsApi.listEvents] got', response.data?.length, 'events');
        return response;
      },
      providesTags: ['Event'],
    }),
    getEvent: builder.query<AppEvent, number>({
      query: (id) => {
        console.log('[eventsApi.getEvent] id:', id);
        return `/events/${id}`;
      },
      transformResponse: (response: AppEvent) => {
        console.log('[eventsApi.getEvent] got:', response.id, response.title, 'status:', response.status, 'price:', response.ticket_price);
        return response;
      },
      providesTags: (_r, _e, id) => [{ type: 'Event', id }],
    }),
    listMyEvents: builder.query<AppEvent[], void>({
      query: () => {
        console.log('[eventsApi.listMyEvents] fetching');
        return '/events/my';
      },
      transformResponse: (response: AppEvent[]) => {
        console.log('[eventsApi.listMyEvents] got', response.length, 'events');
        return response;
      },
      providesTags: ['Event'],
    }),
    createEvent: builder.mutation<AppEvent, CreateEventInput>({
      query: (body) => {
        console.log('[eventsApi.createEvent] body:', JSON.stringify(body));
        return { url: '/events', method: 'POST', body };
      },
      transformResponse: (response: AppEvent) => {
        console.log('[eventsApi.createEvent] created:', response.id, response.title);
        return response;
      },
      invalidatesTags: ['Event'],
    }),
    updateEvent: builder.mutation<AppEvent, UpdateEventInput>({
      query: ({ id, ...body }) => {
        console.log('[eventsApi.updateEvent] id:', id, 'body:', JSON.stringify(body));
        return { url: `/events/${id}`, method: 'PUT', body };
      },
      transformResponse: (response: AppEvent) => {
        console.log('[eventsApi.updateEvent] updated:', response.id, response.title);
        return response;
      },
      invalidatesTags: ['Event'],
    }),
    createEventPaymentIntent: builder.mutation<
      EventPaymentIntent,
      { eventId: number; ticket_count?: number }
    >({
      query: ({ eventId, ticket_count }) => {
        console.log('[eventsApi.createPaymentIntent] eventId:', eventId, 'ticket_count:', ticket_count);
        return {
          url: `/events/${eventId}/payment-intent`,
          method: 'POST',
          body: { ticket_count },
        };
      },
      transformResponse: (response: EventPaymentIntent) => {
        console.log('[eventsApi.createPaymentIntent] got orderId:', response.order_id, 'amount:', response.amount, response.currency);
        return response;
      },
    }),
    registerForEvent: builder.mutation<
      EventRegistration & { qr_code: string },
      {
        eventId: number;
        ticket_count?: number;
        payment?: EventPaymentPayload;
      }
    >({
      query: ({ eventId, ticket_count, payment }) => {
        console.log('[eventsApi.registerForEvent] eventId:', eventId, 'tickets:', ticket_count, 'hasPayment:', !!payment);
        if (payment) {
          console.log('[eventsApi.registerForEvent] payment — order:', payment.razorpay_order_id, 'paymentId:', payment.razorpay_payment_id);
        }
        return {
          url: `/events/${eventId}/register`,
          method: 'POST',
          body: { ticket_count, payment },
        };
      },
      transformResponse: (response: EventRegistration & { qr_code: string }) => {
        console.log('[eventsApi.registerForEvent] SUCCESS — regId:', response.id, 'qr:', response.qr_code, 'paymentStatus:', response.payment_status);
        return response;
      },
      invalidatesTags: ['Event'],
    }),
    getEventRegistrations: builder.query<EventRegistration[], number>({
      query: (eventId) => {
        console.log('[eventsApi.getEventRegistrations] eventId:', eventId);
        return `/events/${eventId}/registrations`;
      },
      transformResponse: (response: EventRegistration[]) => {
        console.log('[eventsApi.getEventRegistrations] got', response.length, 'registrations');
        return response;
      },
      providesTags: ['Event'],
    }),
    getMyRegistrations: builder.query<EventRegistration[], void>({
      query: () => {
        console.log('[eventsApi.getMyRegistrations] fetching');
        return '/events/registrations/my';
      },
      transformResponse: (response: EventRegistration[]) => {
        console.log('[eventsApi.getMyRegistrations] got', response.length, 'passes');
        return response;
      },
      providesTags: ['Event'],
    }),
    verifyRegistration: builder.mutation<
      {
        registration_id: number;
        qr_code: string;
        ticket_count: number;
        payment_status: string;
        amount_paid: number | null;
        registered_at: string;
        user: { id: number; name: string; phone: string; profile_picture: string | null } | null;
        event: { id: number; title: string; date: string; time: string; location: string | null } | null;
      },
      string
    >({
      query: (qr_code) => {
        console.log('[eventsApi.verifyRegistration] qr_code:', qr_code);
        return {
          url: '/events/verify',
          method: 'POST',
          body: { qr_code },
        };
      },
      transformResponse: (response: any) => {
        console.log('[eventsApi.verifyRegistration] result — regId:', response.registration_id, 'user:', response.user?.name, 'paymentStatus:', response.payment_status);
        return response;
      },
    }),
  }),
});

export const {
  useListEventsQuery,
  useGetEventQuery,
  useListMyEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useCreateEventPaymentIntentMutation,
  useRegisterForEventMutation,
  useGetEventRegistrationsQuery,
  useGetMyRegistrationsQuery,
  useVerifyRegistrationMutation,
} = eventsApi;
