import { baseApi } from './baseApi';

export const businessCardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCards: builder.query<
      { data: any[]; page: number },
      { page?: number; search?: string; limit?: number }
    >({
      query: ({ page = 1, search, limit } = {}) =>
        `/cards?page=${page}${limit ? `&limit=${limit}` : ''}${
          search ? `&search=${encodeURIComponent(search)}` : ''
        }`,
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
  useGetSharedCardsQuery,
  useUploadImageMutation,
} = businessCardsApi;
