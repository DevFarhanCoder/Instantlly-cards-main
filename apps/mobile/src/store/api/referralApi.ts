import { baseApi } from './baseApi';

export interface CreditConfig {
  signup_bonus: number;
  referral_reward: number;
}

export interface ReferralStats {
  referralCode: string | null;
  totalReferrals: number;
  totalCreditsEarned: number;
}

export interface ReferralHistoryItem {
  id: number;
  referredUser: { id: number; name: string | null; profilePicture: string | null };
  status: string;
  rewardGiven: boolean;
  creditsEarned: number;
  createdAt: string;
}

export interface ReferralHistoryResponse {
  referrals: ReferralHistoryItem[];
  totalPages: number;
  currentPage: number;
  totalReferrals: number;
}

export interface EarningsHistoryItem {
  id: number;
  amount: number;
  description: string | null;
  transactionId: string;
  createdAt: string;
}

export interface EarningsHistoryResponse {
  earnings: EarningsHistoryItem[];
  totalPages: number;
  currentPage: number;
  totalEarnings: number;
  totalTransactions: number;
}

export const referralApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCreditConfig: builder.query<CreditConfig, void>({
      query: () => '/credits/config',
      providesTags: ['Credits'],
      keepUnusedDataFor: 0,
    }),
    getReferralStats: builder.query<ReferralStats, void>({
      query: () => '/credits/referral-stats',
      providesTags: ['Referral'],
    }),
    getReferralHistory: builder.query<ReferralHistoryResponse, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => `/credits/referral-history?page=${page}&limit=${limit}`,
      providesTags: ['Referral'],
    }),
    getEarningsHistory: builder.query<EarningsHistoryResponse, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => `/credits/earnings-history?page=${page}&limit=${limit}`,
      providesTags: ['Referral'],
    }),
  }),
});

export const {
  useGetCreditConfigQuery,
  useGetReferralStatsQuery,
  useGetReferralHistoryQuery,
  useGetEarningsHistoryQuery,
} = referralApi;
