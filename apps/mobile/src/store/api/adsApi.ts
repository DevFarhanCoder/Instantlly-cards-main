import { baseApi } from './baseApi';

export const adsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAds: builder.query<any[], void>({
      query: () => '/ads',
      providesTags: ['Ad'],
    }),
    getMyAds: builder.query<any[], void>({
      query: () => '/ads/my',
      providesTags: ['Ad'],
    }),
    trackImpression: builder.mutation<any, number>({
      query: (id) => ({ url: `/ads/${id}/impression`, method: 'POST' }),
    }),
    trackClick: builder.mutation<any, number>({
      query: (id) => ({ url: `/ads/${id}/click`, method: 'POST' }),
    }),
  }),
});

export const {
  useListAdsQuery,
  useGetMyAdsQuery,
  useTrackImpressionMutation,
  useTrackClickMutation,
} = adsApi;
