import { baseApi } from './baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardCounts: builder.query<Record<string, number>, void>({
      query: () => '/admin/dashboard',
    }),
    listUsers: builder.query<{ data: any[]; page: number }, { page?: number }>({
      query: ({ page = 1 } = {}) => `/admin/users?page=${page}`,
      providesTags: ['User'],
    }),
    getPendingPromotions: builder.query<{ data: any[]; page: number }, { page?: number }>({
      query: ({ page = 1 } = {}) => `/admin/promotions/pending?page=${page}`,
      providesTags: ['Promotion'],
    }),
    approvePromotion: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/promotions/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Promotion'],
    }),
    rejectPromotion: builder.mutation<any, { id: number; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/admin/promotions/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Promotion'],
    }),
  }),
});

export const {
  useGetDashboardCountsQuery,
  useListUsersQuery,
  useGetPendingPromotionsQuery,
  useApprovePromotionMutation,
  useRejectPromotionMutation,
} = adminApi;
