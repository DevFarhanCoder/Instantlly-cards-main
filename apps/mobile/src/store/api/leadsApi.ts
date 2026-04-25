import { baseApi } from './baseApi';

export interface Lead {
  id: number;
  business_id: number | null;
  business_promotion_id: number | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'lost';
  created_at: string;
}

export interface CreateLeadInput {
  business_id?: number;
  business_promotion_id?: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  message?: string;
}

// Add Lead tag type on first import — baseApi tagTypes can be extended
// but in RTK Query, using an unregistered tag silently works; we keep 'Lead' as string.

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBusinessLeads: builder.query<
      { data: Lead[]; page: number; limit: number },
      { businessId: number; promotionId?: number; page?: number; status?: string }
    >({
      query: ({ businessId, promotionId, page = 1, status }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (promotionId) params.set('promotion_id', String(promotionId));
        if (status) params.set('status', status);
        return `/leads/business/${businessId}?${params.toString()}`;
      },
      providesTags: (_r, _e, { businessId }) => [{ type: 'Lead', id: `b-${businessId}` }],
    }),
    listPromotionLeads: builder.query<
      { data: Lead[]; page: number; limit: number },
      { promotionId: number; page?: number; status?: string }
    >({
      query: ({ promotionId, page = 1, status }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (status) params.set('status', status);
        return `/leads/promotion/${promotionId}?${params.toString()}`;
      },
      providesTags: (_r, _e, { promotionId }) => [{ type: 'Lead', id: `p-${promotionId}` }],
    }),
    createLead: builder.mutation<Lead, CreateLeadInput>({
      query: (body) => ({ url: `/leads`, method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => {
        const tags: any[] = [];
        if (arg.business_id) tags.push({ type: 'Lead', id: `b-${arg.business_id}` });
        if (arg.business_promotion_id) tags.push({ type: 'Lead', id: `p-${arg.business_promotion_id}` });
        return tags;
      },
    }),
    updateLeadStatus: builder.mutation<Lead, { id: number; status: string }>({
      query: ({ id, status }) => ({ url: `/leads/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Lead'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListBusinessLeadsQuery,
  useListPromotionLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadStatusMutation,
} = leadsApi;
