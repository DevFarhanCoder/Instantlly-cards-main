import { baseApi } from './baseApi';

export interface AdCampaign {
  phone: any;
  phone_number: any;
  id: number;
  user_id: number;
  business_card_id: number | null;
  title: string;
  description: string | null;
  ad_type: string;
  cta: string | null;
  creative_url: string | null;
  creative_urls: string[];
  target_city: string | null;
  target_age: string | null;
  target_interests: string | null;
  daily_budget: number;
  duration_days: number;
  total_budget: number | null;
  impressions: number;
  clicks: number;
  spent: number;
  status: string;
  approval_status: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  variants?: AdVariant[];
  business?: { id: number; company_name: string | null; logo_url: string | null };
}

export interface AdVariant {
  id: number;
  campaign_id: number;
  creative_url: string;
  label: string;
  impressions: number;
  clicks: number;
}

export interface CreateCampaignInput {
  title: string;
  description?: string;
  ad_type: string;
  cta?: string;
  creative_url?: string;
  creative_urls?: string[];
  target_city?: string;
  target_age?: string;
  target_interests?: string;
  daily_budget: number;
  duration_days: number;
  business_card_id?: number | string;
}

export const adsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List active campaigns (public delivery)
    listActiveCampaigns: builder.query<AdCampaign[], { ad_type?: string; city?: string } | void>({
      query: (params) => ({
        url: '/ads/campaigns',
        params: params || undefined,
      }),
      providesTags: ['Ad'],
    }),

    // Get my campaigns (optionally scoped to a specific promotion)
    getMyCampaigns: builder.query<AdCampaign[], { promotionId?: number } | void>({
      query: (params) => {
        const url = '/ads/campaigns/my';
        if (params?.promotionId) return { url, params: { promotionId: params.promotionId } };
        return url;
      },
      providesTags: ['Ad'],
    }),

    // Get single campaign
    getCampaign: builder.query<AdCampaign, number>({
      query: (id) => `/ads/campaigns/${id}`,
      providesTags: ['Ad'],
    }),

    // Create campaign
    createCampaign: builder.mutation<AdCampaign, CreateCampaignInput>({
      query: (body) => ({ url: '/ads/campaigns', method: 'POST', body }),
      invalidatesTags: ['Ad'],
    }),

    // Update campaign
    updateCampaign: builder.mutation<AdCampaign, { id: number; [key: string]: any }>({
      query: ({ id, ...body }) => ({ url: `/ads/campaigns/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Ad'],
    }),

    // Delete campaign
    deleteCampaign: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/ads/campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Ad'],
    }),

    // Track impression
    trackImpression: builder.mutation<{ ok: boolean }, { id: number; variant_id?: number }>({
      query: ({ id, ...body }) => ({ url: `/ads/campaigns/${id}/impression`, method: 'POST', body }),
    }),

    // Track click
    trackClick: builder.mutation<{ ok: boolean }, { id: number; variant_id?: number }>({
      query: ({ id, ...body }) => ({ url: `/ads/campaigns/${id}/click`, method: 'POST', body }),
    }),

    // Get campaign analytics
    getCampaignAnalytics: builder.query<any, number>({
      query: (id) => `/ads/campaigns/${id}/analytics`,
      providesTags: ['Ad'],
    }),

    // Get campaign variants
    getCampaignVariants: builder.query<AdVariant[], number>({
      query: (id) => `/ads/campaigns/${id}/variants`,
      providesTags: ['Ad'],
    }),

    // Upload ad creative image via backend S3
    uploadAdCreative: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/uploads/ad-creative',
        method: 'POST',
        body: formData,
        formData: true,
      }),
    }),
  }),
});

export const {
  useListActiveCampaignsQuery,
  useGetMyCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useTrackImpressionMutation,
  useTrackClickMutation,
  useGetCampaignAnalyticsQuery,
  useGetCampaignVariantsQuery,
  useUploadAdCreativeMutation,
} = adsApi;
