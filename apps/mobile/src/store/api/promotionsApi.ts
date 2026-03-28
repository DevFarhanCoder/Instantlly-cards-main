import { baseApi } from './baseApi';

export const promotionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPromotionsNearby: builder.query<
      { data: any[]; page: number; limit?: number },
      { page?: number; limit?: number; search?: string; category?: string; listing_type?: string; status?: string; is_active?: boolean; lat?: number; lng?: number; radius?: number; city?: string; state?: string }
    >({
      query: ({ page = 1, limit = 20, search, category, listing_type, status, is_active, lat, lng, radius, city, state } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (listing_type) params.set('listing_type', listing_type);
        if (status) params.set('status', status);
        if (typeof is_active === 'boolean') params.set('is_active', String(is_active));
        if (typeof lat === 'number') params.set('lat', String(lat));
        if (typeof lng === 'number') params.set('lng', String(lng));
        if (typeof radius === 'number') params.set('radius', String(radius));
        if (city) params.set('city', city);
        if (state) params.set('state', state);
        return `/promotions/nearby?${params.toString()}`;
      },
      providesTags: ['Promotion'],
    }),
    listPromotions: builder.query<
      { data: any[]; page: number; limit?: number },
      { page?: number; limit?: number; search?: string; category?: string; listing_type?: string; status?: string; is_active?: boolean }
    >({
      query: ({ page = 1, limit = 20, search, category, listing_type, status, is_active } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (listing_type) params.set('listing_type', listing_type);
        if (status) params.set('status', status);
        if (typeof is_active === 'boolean') params.set('is_active', String(is_active));
        return `/promotions?${params.toString()}`;
      },
      providesTags: ['Promotion'],
    }),
    getPromotion: builder.query<any, number>({
      query: (id) => `/promotions/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Promotion', id }],
    }),
    getMyPromotions: builder.query<any[], void>({
      query: () => '/promotions/my',
      providesTags: ['Promotion'],
    }),
    createPromotion: builder.mutation<any, Partial<any>>({
      query: (body) => ({ url: '/promotions', method: 'POST', body }),
      invalidatesTags: ['Promotion'],
    }),
    updatePromotion: builder.mutation<any, { id: number; data: Partial<any> }>({
      query: ({ id, data }) => ({ url: `/promotions/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Promotion', id }, 'Promotion'],
    }),
  }),
});

export const {
  useListPromotionsQuery,
  useListPromotionsNearbyQuery,
  useGetPromotionQuery,
  useGetMyPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
} = promotionsApi;
