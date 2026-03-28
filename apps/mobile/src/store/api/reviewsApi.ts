import { baseApi } from './baseApi';

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCardReviews: builder.query<any[], number>({
      query: (cardId) => `/reviews/card/${cardId}`,
      providesTags: (_r, _e, cardId) => [{ type: 'Review', id: cardId }],
    }),
    createReview: builder.mutation<any, { business_id: number; rating: number; comment?: string; photo_url?: string }>({
      query: (body) => ({ url: '/reviews', method: 'POST', body }),
      invalidatesTags: (_r, _e, { business_id }) => [{ type: 'Review', id: business_id }],
    }),
    createFeedback: builder.mutation<any, { message: string; subject?: string; rating?: number }>({
      query: (body) => ({ url: '/reviews/feedback', method: 'POST', body }),
    }),
  }),
});

export const {
  useGetCardReviewsQuery,
  useCreateReviewMutation,
  useCreateFeedbackMutation,
} = reviewsApi;
