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
        const url = `/promotions/nearby?${params.toString()}`;
        console.log('[listPromotionsNearby API] Request:', { url, category, page, limit });
        return url;
      },
      transformResponse: (response: { data: any[]; page: number; limit?: number }) => {
        console.log('[listPromotionsNearby API] Response:', { dataLength: response.data.length, page: response.page });
        return response;
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
        const url = `/promotions?${params.toString()}`;
        console.log('[listPromotions API] Request:', { url, category, page, limit });
        return url;
      },
      transformResponse: (response: { data: any[]; page: number; limit?: number }) => {
        console.log('[listPromotions API] Response:', { dataLength: response.data.length, page: response.page });
        return response;
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
    listPricingPlans: builder.query<any[], void>({
      query: () => '/promotions/pricing-plans',
    }),
    createPromotionPaymentIntent: builder.mutation<
      { key: string; order_id: string; amount: number; currency: string; promotion_order_id: number },
      { promoId: number; pricing_plan_id: number }
    >({
      query: ({ promoId, pricing_plan_id }) => ({
        url: `/promotions/${promoId}/payment-intent`,
        method: 'POST',
        body: { pricing_plan_id },
      }),
    }),
    verifyPromotionPayment: builder.mutation<
      {
        tier: any; success: boolean; order: any; promotion: any; roles?: string[]; accessToken?: string; refreshToken?: string 
},
      { promoId: number; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
    >({
      query: ({ promoId, ...body }) => ({
        url: `/promotions/${promoId}/verify-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Promotion'],
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
  useListPricingPlansQuery,
  useCreatePromotionPaymentIntentMutation,
  useVerifyPromotionPaymentMutation,
} = promotionsApi;
