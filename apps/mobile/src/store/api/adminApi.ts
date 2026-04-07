import { baseApi } from './baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardCounts: builder.query<Record<string, number>, void>({
      query: () => '/admin/dashboard',
    }),
    listAdminUsers: builder.query<{ data: any[]; page: number }, { page?: number } | void>({
      query: (params) => `/admin/users?page=${(params as any)?.page || 1}`,
      providesTags: ['User'],
    }),
    getPendingPromotions: builder.query<{ data: any[]; page: number }, { page?: number } | void>({
      query: (params) => `/admin/promotions/pending?page=${(params as any)?.page || 1}`,
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
    // Ad campaign admin endpoints
    getAdminAds: builder.query<any[], { approval_status?: string } | void>({
      query: (params) => ({
        url: '/admin/ads',
        params: params || undefined,
      }),
      providesTags: ['Ad'],
    }),
    getAdminAdDetails: builder.query<any, number>({
      query: (id) => `/admin/ads/${id}`,
      providesTags: ['Ad'],
    }),
    approveAdCampaign: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/ads/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['Ad'],
    }),
    rejectAdCampaign: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/ads/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['Ad'],
    }),
    pauseAdCampaign: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/ads/${id}/pause`, method: 'POST' }),
      invalidatesTags: ['Ad'],
    }),
    resumeAdCampaign: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/ads/${id}/resume`, method: 'POST' }),
      invalidatesTags: ['Ad'],
    }),
    deleteAdCampaign: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/ads/${id}/delete`, method: 'POST' }),
      invalidatesTags: ['Ad'],
    }),
    // Listing endpoints
    getAdminBusinesses: builder.query<any[], { approval_status?: string } | void>({
      query: (params) => ({
        url: '/admin/businesses',
        params: params || undefined,
      }),
      providesTags: ['BusinessCard'],
    }),
    approveBusinessCard: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/businesses/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['BusinessCard'],
    }),
    rejectBusinessCard: builder.mutation<any, number>({
      query: (id) => ({ url: `/admin/businesses/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['BusinessCard'],
    }),
    getAdminEvents: builder.query<any[], void>({
      query: () => '/admin/events',
      providesTags: ['Event'],
    }),
    getAdminVouchers: builder.query<any[], void>({
      query: () => '/admin/vouchers',
      providesTags: ['Voucher'],
    }),
    getAdminReviews: builder.query<any[], void>({
      query: () => '/admin/reviews',
      providesTags: ['Review'],
    }),
  }),
});

export const {
  useGetDashboardCountsQuery,
  useListAdminUsersQuery,
  useGetPendingPromotionsQuery,
  useApprovePromotionMutation,
  useRejectPromotionMutation,
  useGetAdminAdsQuery,
  useGetAdminAdDetailsQuery,
  useApproveAdCampaignMutation,
  useRejectAdCampaignMutation,
  usePauseAdCampaignMutation,
  useResumeAdCampaignMutation,
  useDeleteAdCampaignMutation,
  useGetAdminBusinessesQuery,
  useApproveBusinessCardMutation,
  useRejectBusinessCardMutation,
  useGetAdminEventsQuery,
  useGetAdminVouchersQuery,
  useGetAdminReviewsQuery,
} = adminApi;
