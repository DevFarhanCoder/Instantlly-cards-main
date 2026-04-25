import { baseApi } from './baseApi';

export interface Booking {
  id: number;
  user_id: number;
  business_id: number;
  business_name: string;
  mode: 'visit' | 'call' | 'video';
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  business?: {
    id: number;
    company_name: string | null;
    logo_url: string | null;
    full_name: string;
  };
}

export interface CreateBookingInput {
  business_id?: number;
  business_promotion_id?: number;
  business_name?: string;
  mode?: 'visit' | 'call' | 'video';
  booking_date?: string;
  booking_time?: string;
  customer_name: string;
  customer_phone: string;
  notes?: string;
}

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMyBookings: builder.query<{ data: Booking[] }, { page?: number }>({
      query: ({ page = 1 } = {}) => `/bookings/my?page=${page}`,
      providesTags: ['Booking'],
    }),
    listBusinessBookings: builder.query<{ data: Booking[] }, { businessId: number; promotionId?: number; status?: string; page?: number }>({
      query: ({ businessId, promotionId, status, page = 1 }) => {
        let url = `/bookings/business/${businessId}?page=${page}`;
        if (status) url += `&status=${status}`;
        if (promotionId) url += `&promotion_id=${promotionId}`;
        return url;
      },
      providesTags: ['Booking'],
    }),
    listPromotionBookings: builder.query<{ data: Booking[] }, { promotionId: number; status?: string; page?: number }>({
      query: ({ promotionId, status, page = 1 }) => {
        let url = `/bookings/promotion/${promotionId}?page=${page}`;
        if (status) url += `&status=${status}`;
        return url;
      },
      providesTags: ['Booking'],
    }),
    getBooking: builder.query<Booking, number>({
      query: (id) => `/bookings/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Booking', id }],
    }),
    createBooking: builder.mutation<Booking, CreateBookingInput>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      invalidatesTags: ['Booking'],
    }),
    updateBookingStatus: builder.mutation<Booking, { id: number; status: string }>({
      query: ({ id, status }) => ({ url: `/bookings/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Booking'],
    }),
  }),
});

export const {
  useListMyBookingsQuery,
  useListBusinessBookingsQuery,
  useListPromotionBookingsQuery,
  useGetBookingQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
} = bookingsApi;
