import { baseApi } from './baseApi';

export const businessCardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCards: builder.query<
      { data: any[]; page: number; total: number },
      { page?: number; search?: string; limit?: number; category?: string }
    >({
      query: ({ page = 1, search, limit, category } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (limit) params.set('limit', String(limit));
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        return `/cards?${params.toString()}`;
      },
      providesTags: ['BusinessCard'],
    }),
    getCard: builder.query<any, number>({
      query: (id) => `/cards/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'BusinessCard', id }],
    }),
    getMyCards: builder.query<any[], void>({
      query: () => '/cards/my',
      providesTags: ['BusinessCard'],
    }),
    createCard: builder.mutation<any, Partial<any>>({
      query: (body) => ({ url: '/cards', method: 'POST', body }),
      invalidatesTags: ['BusinessCard'],
    }),
    updateCard: builder.mutation<any, { id: number; data: Partial<any> }>({
      query: ({ id, data }) => ({ url: `/cards/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'BusinessCard', id }, 'BusinessCard'],
    }),
    deleteCard: builder.mutation<any, number>({
      query: (id) => ({ url: `/cards/${id}`, method: 'DELETE' }),
      invalidatesTags: ['BusinessCard'],
    }),
    shareCard: builder.mutation<any, { card_id: number; recipient_user_id: number; message?: string }>({
      query: (body) => ({ url: '/cards/share', method: 'POST', body }),
      invalidatesTags: ['SharedCard'],
    }),
    exchangeCards: builder.mutation<
      { outgoing: any; incoming: any; alreadyExists: boolean },
      { my_card_id: number; scanned_card_id: number }
    >({
      query: (body) => ({ url: '/cards/exchange', method: 'POST', body }),
      invalidatesTags: ['SharedCard'],
    }),
    saveReceivedCard: builder.mutation<any, { scanned_card_id: number }>({
      query: (body) => ({ url: '/cards/save-received', method: 'POST', body }),
      invalidatesTags: ['SharedCard'],
    }),
    bulkSendCard: builder.mutation<
      { sent: number; audience: string; level: string; message: string },
      { card_id: number; audience: string; audience_type: 'category' | 'subcategory'; level: string }
    >({
      query: (body) => ({ url: '/cards/bulk-send', method: 'POST', body }),
      invalidatesTags: ['SharedCard'],
    }),
    getSharedCards: builder.query<any[], void>({
      query: () => '/cards/shared',
      providesTags: ['SharedCard'],
    }),
    uploadImage: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/uploads/image',
        method: 'POST',
        body: formData,
        formData: true,
      }),
    }),
  }),
});

export const {
  useListCardsQuery,
  useGetCardQuery,
  useGetMyCardsQuery,
  useCreateCardMutation,
  useUpdateCardMutation,
  useDeleteCardMutation,
  useShareCardMutation,
  useExchangeCardsMutation,
  useSaveReceivedCardMutation,
  useBulkSendCardMutation,
  useGetSharedCardsQuery,
  useUploadImageMutation,
} = businessCardsApi;
