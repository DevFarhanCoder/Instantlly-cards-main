import { baseApi } from './baseApi';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCardReviews: builder.query<any[], number>({
      query: (cardId) => `/reviews/card/${cardId}`,
      providesTags: (_r, _e, cardId) => [{ type: 'Review', id: cardId }],
    }),
    getPromotionReviews: builder.query<any[], number>({
      query: (promotionId) => `/reviews/promotion/${promotionId}`,
      providesTags: (_r, _e, promotionId) => [{ type: 'Review', id: `p-${promotionId}` }],
    }),
    createReview: builder.mutation<any, { business_id?: number; business_promotion_id?: number; rating: number; comment?: string; photo_url?: string }>({
      query: (body) => ({ url: '/reviews', method: 'POST', body }),
      invalidatesTags: (_r, _e, { business_id, business_promotion_id }) => {
        const tags: any[] = [];
        if (business_id) tags.push({ type: 'Review', id: business_id });
        if (business_promotion_id) tags.push({ type: 'Review', id: `p-${business_promotion_id}` });
        return tags;
      },
    }),
    createFeedback: builder.mutation<any, { message: string; subject?: string; rating?: number }>({
      query: (body) => ({ url: '/reviews/feedback', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetCardReviewsQuery,
  useGetPromotionReviewsQuery,
  useCreateReviewMutation,
  useCreateFeedbackMutation,
} = reviewsApi;
