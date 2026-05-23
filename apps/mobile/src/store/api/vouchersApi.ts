import { baseApi } from './baseApi';

export const vouchersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listVouchers: builder.query<{ data: any[]; page: number }, { page?: number; city?: string; pincode?: string }>({
      query: ({ page = 1, city, pincode } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        if (city) params.set('city', city);
        if (pincode) params.set('pincode', pincode);
        return `/vouchers?${params.toString()}`;
      },
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
    getMyCreatedVouchers: builder.query<any[], { promotionId?: number } | void>({
      query: (args) => {
        const promotionId = args && 'promotionId' in args ? args.promotionId : undefined;
        return promotionId ? `/vouchers/created?promotionId=${promotionId}` : '/vouchers/created';
      },
      providesTags: ['Voucher'],
    }),
    claimVoucher: builder.mutation<any, number>({
      query: (id) => ({ url: `/vouchers/${id}/claim`, method: 'POST' }),
      invalidatesTags: ['Voucher'],
    }),
    transferVoucher: builder.mutation<any, { voucher_id: number; recipient_phone: string; quantity?: number }>({
      query: (body) => ({ url: '/vouchers/transfer', method: 'POST', body }),
      invalidatesTags: ['Voucher'],
    }),
    ownerTransferVoucher: builder.mutation<any, { id: number; recipient_phone: string; quantity: number }>({
      query: ({ id, ...body }) => ({ url: `/vouchers/${id}/owner-transfer`, method: 'POST', body }),
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
    updateVoucherStatus: builder.mutation<any, { id: number; status: string }>({
      query: ({ id, status }) => ({ url: `/vouchers/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Voucher'],
    }),
    updateVoucher: builder.mutation<any, { id: number; [key: string]: any }>({
      query: ({ id, ...body }) => ({ url: `/vouchers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Voucher'],
    }),
    deleteVoucher: builder.mutation<{ success: boolean; soft_deleted?: boolean; deleted?: boolean; message?: string }, number>({
      query: (id) => ({ url: `/vouchers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Voucher'],
    }),
    uploadVoucherImage: builder.mutation<{ url: string }, FormData>({
      query: (body) => ({
        url: '/uploads/image',
        method: 'POST',
        body,
        formData: true,
      }),
    }),
    createVoucherPaymentIntent: builder.mutation<
      {
        key: string; order_id: string; amount: number; currency: string;
        voucher_id: number; voucher_title: string;
        quantity: number; price_per_unit: number;
        promo_applied: boolean; applicable_price: number;
        allows_installment: boolean; upfront_amount: number | null;
        remaining_after_upfront: number;
      },
        { id: number; promo_code?: string; payment_mode?: "full" | "upfront"; quantity?: number }
    >({
        query: ({ id, promo_code, payment_mode, quantity }) => ({ url: `/vouchers/${id}/payment-intent`, method: 'POST', body: { promo_code, payment_mode, quantity } }),
    }),
    verifyVoucherPayment: builder.mutation<
      any,
      { voucherId: number; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; promo_applied?: boolean; allows_installment?: boolean; quantity?: number }
    >({
      query: ({ voucherId, ...body }) => ({
        url: `/vouchers/${voucherId}/verify-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Voucher'],
    }),
    createInstallmentPaymentIntent: builder.mutation<
      { key: string; order_id: string; amount: number; currency: string; claim_id: number; voucher_title: string },
      { claimId: number; amount: number }
    >({
      query: ({ claimId, amount }) => ({ url: `/vouchers/claims/${claimId}/installment/pay`, method: 'POST', body: { amount } }),
    }),
    verifyInstallmentPayment: builder.mutation<
      { success: boolean; remaining_balance: number; paid_amount: number; installment_status: string },
      { claimId: number; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; amount: number }
    >({
      query: ({ claimId, ...body }) => ({ url: `/vouchers/claims/${claimId}/installment/verify`, method: 'POST', body }),
      invalidatesTags: ['Voucher'],
    }),
    getInstallmentStatus: builder.query<any, number>({
      query: (claimId) => `/vouchers/claims/${claimId}/installment`,
      providesTags: (_r, _e, id) => [{ type: 'Voucher', id }],
    }),
    getMyInstallments: builder.query<any[], void>({
      query: () => '/vouchers/my-installments',
      providesTags: ['Voucher'],
    }),
    getVoucherInstallmentLedger: builder.query<any[], number>({
      query: (voucherId) => `/vouchers/${voucherId}/installment-ledger`,
      providesTags: (_r, _e, id) => [{ type: 'Voucher', id }],
    }),
    getVoucherClaims: builder.query<any[], number>({
      query: (voucherId) => `/vouchers/${voucherId}/claims`,
      providesTags: (_r, _e, id) => [{ type: 'Voucher', id }],
    }),
    getAllMyClaims: builder.query<any[], { status?: string } | void>({
      query: (args) => {
        const status = args && 'status' in args ? args.status : undefined;
        return status ? `/vouchers/all-claims?status=${status}` : '/vouchers/all-claims';
      },
      providesTags: ['Voucher'],
    }),
    redeemVoucherByQr: builder.mutation<any, { voucher_id: number; claim_id: number; redeem_quantity?: number }>({
      query: (body) => ({ url: '/vouchers/redeem-by-qr', method: 'POST', body }),
      invalidatesTags: ['Voucher'],
    }),
    getSentOwnerTransfers: builder.query<any[], void>({
      query: () => '/vouchers/owner-transfers/sent',
      providesTags: ['Voucher'],
    }),
    settleOwnerTransfer: builder.mutation<any, { transferId: number; amount?: number }>({
      query: ({ transferId, amount }) => ({
        url: `/vouchers/owner-transfers/${transferId}/settle`,
        method: 'POST',
        body: { amount },
      }),
      invalidatesTags: ['Voucher'],
    }),
    createOwnerTransferPaymentIntent: builder.mutation<
      {
        key: string;
        order_id: string;
        amount: number;
        currency: string;
        transfer_id: number;
        voucher_title: string | null;
        pay_amount: number;
      },
      { transferId: number; amount?: number }
    >({
      query: ({ transferId, amount }) => ({
        url: `/vouchers/owner-transfers/${transferId}/pay-intent`,
        method: 'POST',
        body: { amount },
      }),
    }),
    verifyOwnerTransferPayment: builder.mutation<
      any,
      {
        transferId: number;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        amount: number;
      }
    >({
      query: ({ transferId, ...body }) => ({
        url: `/vouchers/owner-transfers/${transferId}/pay-verify`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Voucher'],
    }),
    getOwnerTransferPayments: builder.query<
      Array<{
        id: number;
        transfer_id: number;
        amount: string;
        paid_at: string;
        razorpay_order_id: string;
        razorpay_payment_id: string;
      }>,
      number
    >({
      query: (transferId) => `/vouchers/owner-transfers/${transferId}/payments`,
      providesTags: ['Voucher'],
    }),
    getVoucherStaff: builder.query<
      Array<{
        id: number;
        voucher_id: number;
        user_id: number;
        role: string;
        assigned_address: string | null;
        created_at: string;
        user: { id: number; name: string | null; phone: string | null };
      }>,
      number
    >({
      query: (voucherId) => `/vouchers/${voucherId}/staff`,
      providesTags: (_result, _err, voucherId) => [{ type: 'Voucher', id: `staff-${voucherId}` }],
    }),
    addVoucherStaff: builder.mutation<
      { id: number },
      { voucherId: number; phone: string; role?: string; assigned_address?: string }
    >({
      query: ({ voucherId, ...body }) => ({
        url: `/vouchers/${voucherId}/staff`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { voucherId }) => [{ type: 'Voucher', id: `staff-${voucherId}` }],
    }),
    removeVoucherStaff: builder.mutation<
      { success: boolean },
      { voucherId: number; staffId: number }
    >({
      query: ({ voucherId, staffId }) => ({
        url: `/vouchers/${voucherId}/staff/${staffId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _err, { voucherId }) => [{ type: 'Voucher', id: `staff-${voucherId}` }],
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
  useOwnerTransferVoucherMutation,
  useGetVoucherTransfersQuery,
  useCreateVoucherMutation,
  useUpdateVoucherStatusMutation,
  useUpdateVoucherMutation,
  useDeleteVoucherMutation,
  useUploadVoucherImageMutation,
  useCreateVoucherPaymentIntentMutation,
  useVerifyVoucherPaymentMutation,
  useCreateInstallmentPaymentIntentMutation,
  useVerifyInstallmentPaymentMutation,
  useGetInstallmentStatusQuery,
  useGetMyInstallmentsQuery,
  useGetVoucherInstallmentLedgerQuery,
  useGetVoucherClaimsQuery,
  useGetAllMyClaimsQuery,
  useRedeemVoucherByQrMutation,
  useGetSentOwnerTransfersQuery,
  useSettleOwnerTransferMutation,
  useCreateOwnerTransferPaymentIntentMutation,
  useVerifyOwnerTransferPaymentMutation,
  useGetOwnerTransferPaymentsQuery,
  useLazyGetOwnerTransferPaymentsQuery,
  useGetVoucherStaffQuery,
  useAddVoucherStaffMutation,
  useRemoveVoucherStaffMutation,
} = vouchersApi;
