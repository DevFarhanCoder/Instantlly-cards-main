import { baseApi } from './baseApi';

export const vouchersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listVouchers: builder.query<{ data: any[]; page: number }, { page?: number }>({
      query: ({ page = 1 } = {}) => `/vouchers?page=${page}`,
      providesTags: ['Voucher'],
    }),
    getVoucher: builder.query<any, number>({
      query: (id) => `/vouchers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Voucher', id }],
    }),
    getMyVouchers: builder.query<any[], void>({
      query: () => '/vouchers/my',
      providesTags: ['Voucher'],
    }),
    getMyCreatedVouchers: builder.query<any[], void>({
      query: () => '/vouchers/created',
      providesTags: ['Voucher'],
    }),
    claimVoucher: builder.mutation<any, number>({
      query: (id) => ({ url: `/vouchers/${id}/claim`, method: 'POST' }),
      invalidatesTags: ['Voucher'],
    }),
    transferVoucher: builder.mutation<any, { voucher_id: number; recipient_phone: string }>({
      query: (body) => ({ url: '/vouchers/transfer', method: 'POST', body }),
      invalidatesTags: ['Voucher'],
    }),
    getVoucherTransfers: builder.query<any[], void>({
      query: () => '/vouchers/transfers',
      providesTags: ['Voucher'],
    }),
    createVoucher: builder.mutation<any, any>({
      query: (body) => ({ url: '/vouchers', method: 'POST', body }),
      invalidatesTags: ['Voucher'],
    }),
  }),
});

export const {
  useListVouchersQuery,
  useGetVoucherQuery,
  useGetMyVouchersQuery,
  useGetMyCreatedVouchersQuery,
  useClaimVoucherMutation,
  useTransferVoucherMutation,
  useGetVoucherTransfersQuery,
  useCreateVoucherMutation,
} = vouchersApi;
