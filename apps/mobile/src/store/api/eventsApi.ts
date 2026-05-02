import { baseApi } from './baseApi';

export interface EventBusiness {
  id: number;
  company_name: string | null;
  logo_url: string | null;
  full_name: string;
  phone?: string;
}

/**
 * A ticket tier as returned by the backend's event decorator.
 *
 * Backward-compat note:
 *   • Legacy events (created before tiers shipped) still surface as ONE
 *     synthesized "General" tier with `is_virtual: true` and `id: null`.
 *   • New events with real tiers return them with `is_virtual: false`
 *     and stable numeric ids.
 *
 * The client should NEVER assume tiers exist as DB rows — always read
 * the convenience flags (`is_sold_out`, `is_free`, `is_on_sale`) instead
 * of doing capacity math itself.
 */
export interface AppTicketTier {
  id: number | null;
  event_id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  quantity_total: number | null;
  quantity_sold: number;
  quantity_available: number | null;
  sort_order: number;
  is_active: boolean;
  is_virtual: boolean;
  is_sold_out: boolean;
  is_free: boolean;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  min_per_order: number;
  max_per_order: number;
  is_on_sale: boolean;
}

export interface AppEvent {
  id: number;
  business_id?: number | null;
  business_promotion_id: number;
  title: string;
  description: string | null;
  date: string;
  end_date?: string | null;
  time: string;
  location: string | null;
  venue?: string | null;
  city?: string | null;
  state?: string | null;
  image_url: string | null;
  ticket_price: number | null;
  max_attendees: number | null;
  attendee_count: number;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  /** True for events created before the tier system shipped. The backend
   *  guarantees `ticket_tiers` will be a single virtual "General" tier in
   *  this case so the client can render a single code path. */
  is_legacy?: boolean | null;
  /** True when at least one real (non-virtual) tier exists for the event. */
  has_real_tiers?: boolean;
  /** Always present in responses (decorated by the server). May contain a
   *  single virtual tier for legacy / un-tiered events. NEVER undefined,
   *  but client code MUST still guard with `?? []` for older cached data. */
  ticket_tiers?: AppTicketTier[];
  business?: EventBusiness;
  business_promotion?: { id: number; business_name: string; business_card_id: number | null };
  _count?: { registrations: number };
  cancelled_at?: string | null;
  views_count?: number;
  company_logo?: string | null;
  venue_images?: string[];
  // Recurring events
  recurrence_rule?: string | null;         // JSON string: {"freq":"weekly","days":["TUE"],"interval":1}
  recurrence_ends_at?: string | null;
  parent_event_id?: number | null;         // set on occurrence rows
  occurrences_count?: number;              // number of generated occurrences (on parent)
}

export interface EventRegistration {
  id: number;
  event_id: number;
  user_id: number;
  ticket_count: number;
  cancelled_count?: number; // Number of tickets already cancelled (partial refund support)
  registered_at: string;
  qr_code?: string;
  payment_status?: string;
  payment_order_id?: string | null;
  payment_id?: string | null;
  amount_paid?: number | null;
  /** Phase 5 — check-in / cancel / refund tracking. All optional so older
   *  cached responses still type-check. */
  ticket_tier_id?: number | null;
  ticket_tier?: { id: number; name: string; price: number; currency: string } | null;
  checked_in?: boolean;
  checked_in_at?: string | null;
  cancelled_at?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
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

/** One item in a multi-tier cart */
export interface CartItem {
  tier_id: number;
  ticket_count: number;
}

/** Response from POST /events/:id/payment-intent-cart */
export interface CartPaymentIntent {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  event_id: number;
  event_title: string;
  items: Array<{ tier_id: number; tier_name: string; ticket_count: number; unit_price: number }>;
}

/** Response from POST /events/:id/register-cart */
export interface CartRegistrationResult {
  registrations: Array<EventRegistration & { qr_code: string }>;
}

export interface CreateEventInput {
  business_promotion_id: number;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  time: string;
  location?: string;
  image_url?: string;
  ticket_price?: number;
  max_attendees?: number;
  company_logo?: string;
  venue_images?: string[];
  // Recurring events
  recurrence_rule?: string;        // JSON: {"freq":"weekly","days":["TUE"],"interval":1}
  recurrence_ends_at?: string;     // ISO date string
}

export interface UpdateEventInput {
  id: number;
  title?: string;
  description?: string;
  date?: string;
  end_date?: string;
  time?: string;
  location?: string;
  image_url?: string;
  ticket_price?: number;
  max_attendees?: number;
  status?: string;
  company_logo?: string;
  venue_images?: string[];
}

/** Tier draft used by Create-Event flow before the tier rows exist on the
 *  server. After event creation the client posts each draft to
 *  POST /events/:id/tickets. */
export interface CreateTicketTierInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity_total?: number | null;
  sort_order?: number;
  is_active?: boolean;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  min_per_order?: number;
  max_per_order?: number;
}

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listEvents: builder.query<
      { data: AppEvent[]; page: number; limit: number; total: number },
      { page?: number; limit?: number; search?: string; city?: string; category?: string; date?: string; priceType?: string } | void
    >({
      query: (params) => {
        const { page = 1, limit = 20, search, city, category, date, priceType } = params || {};
        let url = `/events?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (city) url += `&city=${encodeURIComponent(city)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (date) url += `&date=${encodeURIComponent(date)}`;
        if (priceType) url += `&priceType=${encodeURIComponent(priceType)}`;
        console.log('[eventsApi.listEvents] url:', url);
        return url;
      },
      transformResponse: (response: any) => {
        // Defensive normalization — backend currently returns
        //   { data, page, limit, total }
        // but tolerate both:
        //   • bare arrays (older proxies / dev servers)
        //   • { data: { ... } } wrappers (any future API gateway)
        const inner = response?.data ?? response;
        const list: AppEvent[] = Array.isArray(inner)
          ? inner
          : Array.isArray(inner?.data)
            ? inner.data
            : [];
        const page = Number(response?.page ?? inner?.page ?? 1);
        const limit = Number(response?.limit ?? inner?.limit ?? list.length);
        const total = Number(response?.total ?? inner?.total ?? list.length);
        console.log(
          '[eventsApi.listEvents] got', list.length, 'of', total, 'events',
        );
        const withLogo = list.filter((e: any) => e.company_logo);
        console.log('[eventsApi.listEvents] events with logo:', withLogo.length, withLogo.map((e: any) => e.id + ':' + e.company_logo?.slice(-20)));
        return { data: list, page, limit, total };
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
      transformResponse: (response: any) => {
        // Tolerate both `[ ... ]` and `{ data: [ ... ] }` shapes.
        const list: AppEvent[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        console.log('[eventsApi.listMyEvents] got', list.length, 'events');
        return list;
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
      { eventId: number; ticket_count?: number; tier_id?: number | null }
    >({
      query: ({ eventId, ticket_count, tier_id }) => {
        console.log('[eventsApi.createPaymentIntent] eventId:', eventId, 'ticket_count:', ticket_count, 'tier_id:', tier_id);
        return {
          url: `/events/${eventId}/payment-intent`,
          method: 'POST',
          body: { ticket_count, tier_id: tier_id ?? undefined },
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
        tier_id?: number | null;
        payment?: EventPaymentPayload;
      }
    >({
      query: ({ eventId, ticket_count, tier_id, payment }) => {
        console.log('[eventsApi.registerForEvent] eventId:', eventId, 'tickets:', ticket_count, 'tier_id:', tier_id, 'hasPayment:', !!payment);
        if (payment) {
          console.log('[eventsApi.registerForEvent] payment — order:', payment.razorpay_order_id, 'paymentId:', payment.razorpay_payment_id);
        }
        return {
          url: `/events/${eventId}/register`,
          method: 'POST',
          body: { ticket_count, tier_id: tier_id ?? undefined, payment },
        };
      },
      transformResponse: (response: any) => {
        // Normalize both flat (legacy) and nested (tiered) response shapes.
        const reg: EventRegistration & { qr_code: string } =
          response?.registration ? { ...response.registration, qr_code: response.qr_code } : response;
        console.log('[eventsApi.registerForEvent] SUCCESS — regId:', reg.id, 'qr:', reg.qr_code, 'tier:', reg.ticket_tier?.name);
        return reg;
      },
      invalidatesTags: ['Event'],
    }),
    getEventRegistrations: builder.query<EventRegistration[], number>({
      query: (eventId) => {
        console.log('[eventsApi.getEventRegistrations] eventId:', eventId);
        return `/events/${eventId}/registrations`;
      },
      transformResponse: (response: any) => {
        const list: EventRegistration[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        console.log('[eventsApi.getEventRegistrations] got', list.length, 'registrations');
        return list;
      },
      providesTags: ['Event'],
    }),
    getMyRegistrations: builder.query<EventRegistration[], void>({
      query: () => {
        console.log('[eventsApi.getMyRegistrations] fetching');
        return '/events/registrations/my';
      },
      transformResponse: (response: any) => {
        // Defensive normalization — handle both bare arrays and
        // `{ data: [...] }` wrappers, and never return undefined so the
        // "Couldn't load passes" error state isn't triggered by an
        // unexpected response shape.
        const list: EventRegistration[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        console.log('[eventsApi.getMyRegistrations] got', list.length, 'passes');
        return list;
      },
      transformErrorResponse: (error) => {
        console.error(
          '[eventsApi.getMyRegistrations] ERROR — status:', error.status,
          'data:', JSON.stringify(error.data),
        );
        return error;
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
        /** Phase 5 — backend stamps these on every successful scan. */
        checked_in?: boolean;
        checked_in_at?: string | null;
        checked_in_by?: number | null;
        /** True when the QR was previously scanned. UI should show a warning,
         *  not a success (the attendee was already let in). */
        already_used?: boolean;
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
    /** Phase 5 — Join waitlist for a sold-out event. */
    joinEventWaitlist: builder.mutation<
      { waitlist_id: number; position: number; event_id: number },
      { eventId: number; ticket_count?: number }
    >({
      query: ({ eventId, ticket_count }) => {
        console.log('[eventsApi.joinEventWaitlist] eventId:', eventId, 'count:', ticket_count);
        return {
          url: `/events/${eventId}/waitlist`,
          method: 'POST',
          body: { ticket_count },
        };
      },
      invalidatesTags: (_r, _e, arg) => [{ type: 'Event', id: arg.eventId }],
    }),
    /** Phase 5 — Organizer/admin analytics for one event. */
    getEventAnalytics: builder.query<
      {
        event_id: number;
        views: number;
        registrations: number;
        check_ins: number;
        conversion_rate: number;
      },
      number
    >({
      query: (eventId) => {
        console.log('[eventsApi.getEventAnalytics] eventId:', eventId);
        return `/events/${eventId}/analytics`;
      },
      providesTags: (_r, _e, eventId) => [{ type: 'Event', id: eventId }],
    }),
    /** Phase 6 — Organizer creates one ticket tier on an event. The first
     *  successful call automatically flips `is_legacy=false` server-side. */
    createTicketTier: builder.mutation<
      AppTicketTier,
      { eventId: number; tier: CreateTicketTierInput }
    >({
      query: ({ eventId, tier }) => ({
        url: `/events/${eventId}/tickets`,
        method: 'POST',
        body: tier,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    deleteTicketTier: builder.mutation<
      { ok: true },
      { eventId: number; tierId: number }
    >({
      query: ({ eventId, tierId }) => ({
        url: `/events/${eventId}/tickets/${tierId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Phase 3 — Edit an existing tier (price, capacity, sale window, etc.). */
    updateTicketTier: builder.mutation<
      AppTicketTier,
      { eventId: number; tierId: number; tier: Partial<CreateTicketTierInput> }
    >({
      query: ({ eventId, tierId, tier }) => ({
        url: `/events/${eventId}/tickets/${tierId}`,
        method: 'PUT',
        body: tier,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Phase 5 — Organizer cancels an event. Backend cascades refunds and
     *  marks all active registrations cancelled+refunded. */
    cancelEvent: builder.mutation<
      {
        event_id: number;
        cancelled: true;
        refunds: Array<{
          registration_id: number;
          refund_id: string | null;
          already_refunded: boolean;
          error?: string;
        }>;
      },
      { eventId: number; reason?: string }
    >({
      query: ({ eventId, reason }) => {
        console.log('[eventsApi.cancelEvent] eventId:', eventId, 'reason:', reason);
        return {
          url: `/events/${eventId}/cancel`,
          method: 'POST',
          body: { reason },
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Phase 5 — Organizer refunds a single registration. Server rolls back
     *  capacity and triggers waitlist promotion (if any). */
    refundRegistration: builder.mutation<
      {
        registration_id: number;
        refund_id: string | null;
        already_refunded: boolean;
        refund_status: 'refunded';
      },
      { eventId: number; registrationId: number; reason?: string }
    >({
      query: ({ eventId, registrationId, reason }) => {
        console.log(
          '[eventsApi.refundRegistration] eventId:', eventId,
          'regId:', registrationId, 'reason:', reason,
        );
        return {
          url: `/events/${eventId}/refund`,
          method: 'POST',
          body: { registration_id: registrationId, reason },
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Phase 5 — Organizer manually promotes the next waitlisted user. */
    promoteWaitlist: builder.mutation<
      {
        promoted_user_id: number;
        new_registration_id: number;
        waitlist_id: number;
        qr_code: string;
      } | { promoted: false; reason?: string },
      { eventId: number }
    >({
      query: ({ eventId }) => ({
        url: `/events/${eventId}/waitlist/promote`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Partial cancel — user cancels N of their own tickets.
     *  cancel_count: number of tickets to cancel (must be ≤ active tickets).
     *  Returns remaining_active_tickets and refund info. */
    partialCancelTickets: builder.mutation<
      {
        registration_id: number;
        cancelled_count: number;
        remaining_active_tickets: number;
        is_fully_cancelled: boolean;
        refund_id: string | null;
        refund_amount: number | null;
      },
      { eventId: number; cancel_count: number; reason?: string }
    >({
      query: ({ eventId, cancel_count, reason }) => {
        console.log('[eventsApi.partialCancelTickets] eventId:', eventId, 'cancel_count:', cancel_count);
        return {
          url: `/events/${eventId}/partial-cancel`,
          method: 'POST',
          body: { cancel_count, reason },
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Event', id: arg.eventId },
        'Event',
      ],
    }),
    /** Multi-tier cart — create one Razorpay order for multiple tiers. */
    createCartPaymentIntent: builder.mutation<
      CartPaymentIntent,
      { eventId: number; items: CartItem[] }
    >({
      query: ({ eventId, items }) => {
        console.log('[eventsApi.createCartPaymentIntent] eventId:', eventId, 'items:', JSON.stringify(items));
        return {
          url: `/events/${eventId}/payment-intent-cart`,
          method: 'POST',
          body: { items },
        };
      },
    }),
    /** Multi-tier cart — register for multiple tiers in one call. */
    registerCart: builder.mutation<
      CartRegistrationResult,
      { eventId: number; items: CartItem[]; payment?: EventPaymentPayload }
    >({
      query: ({ eventId, items, payment }) => {
        console.log('[eventsApi.registerCart] eventId:', eventId, 'items:', JSON.stringify(items), 'hasPayment:', !!payment);
        return {
          url: `/events/${eventId}/register-cart`,
          method: 'POST',
          body: { items, payment },
        };
      },
      transformResponse: (response: CartRegistrationResult) => {
        console.log('[eventsApi.registerCart] SUCCESS — registrations:', response.registrations?.length);
        return response;
      },
      invalidatesTags: ['Event'],
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
  useJoinEventWaitlistMutation,
  useGetEventAnalyticsQuery,
  useCreateTicketTierMutation,
  useDeleteTicketTierMutation,
  useUpdateTicketTierMutation,
  useCancelEventMutation,
  useRefundRegistrationMutation,
  usePromoteWaitlistMutation,
  usePartialCancelTicketsMutation,
  useCreateCartPaymentIntentMutation,
  useRegisterCartMutation,
} = eventsApi;
