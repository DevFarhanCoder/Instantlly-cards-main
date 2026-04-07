import { toast } from "../lib/toast";
import {
  useListVouchersQuery,
  useGetVoucherQuery,
  useGetMyVouchersQuery,
  useGetMyCreatedVouchersQuery,
  useClaimVoucherMutation,
  useCreateVoucherMutation,
  useTransferVoucherMutation,
  useGetVoucherTransfersQuery,
} from "../store/api/vouchersApi";

export interface Voucher {
  id: string;
  user_id: string;
  business_card_id: string | null;
  title: string;
  subtitle: string | null;
  category: string;
  original_price: number;
  discounted_price: number;
  discount_label: string | null;
  is_popular: boolean;
  expires_at: string | null;
  max_claims: number | null;
  terms: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ClaimedVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  code: string;
  status: string;
  purchased_at: string;
  redeemed_at: string | null;
  created_at: string;
  voucher?: Voucher;
}

const mapVoucher = (v: any): Voucher => {
  const original = Number(v.mrp ?? v.amount ?? v.original_price ?? v.discount_value ?? 0);
  const discounted =
    v.discount_type === "percent"
      ? Math.max(0, original - original * (Number(v.discount_value) / 100))
      : Math.max(0, original - Number(v.discount_value ?? 0));
  return {
    id: String(v.id),
    user_id: String(v.owner_user_id ?? v.user_id ?? ""),
    business_card_id: v.business_id ? String(v.business_id) : null,
    title: v.title,
    subtitle: v.description ?? null,
    category: v.category ?? "",
    original_price: original,
    discounted_price: discounted,
    discount_label:
      v.discount_type === "percent"
        ? `${Number(v.discount_value)}% OFF`
        : `₹${Number(v.discount_value ?? 0)} OFF`,
    is_popular: Boolean(v.is_popular),
    expires_at: v.expires_at ?? null,
    max_claims: v.max_claims ?? null,
    terms: v.description ?? null,
    status: v.status ?? "active",
    created_at: v.created_at ?? new Date().toISOString(),
    updated_at: v.updated_at ?? new Date().toISOString(),
  };
};

export function useVouchers() {
  const result = useListVouchersQuery({ page: 1 }, { refetchOnMountOrArgChange: true });
  return {
    ...result,
    data: (result.data?.data || []).map(mapVoucher) as Voucher[],
  };
}

export function useVoucher(id: string) {
  const voucherId = Number(id);
  const result = useGetVoucherQuery(voucherId, { skip: !voucherId });
  return {
    ...result,
    data: result.data ? mapVoucher(result.data) : undefined,
  };
}

export function useMyVouchers() {
  const result = useGetMyVouchersQuery();
  return {
    ...result,
    data: (result.data || []).map((c: any) => ({
      ...c,
      voucher: c.voucher ? mapVoucher(c.voucher) : undefined,
    })) as ClaimedVoucher[],
  };
}

export function useMyCreatedVouchers() {
  const result = useGetMyCreatedVouchersQuery();
  return {
    ...result,
    data: (result.data || []).map(mapVoucher) as Voucher[],
  };
}

export function useClaimVoucher() {
  const [trigger, state] = useClaimVoucherMutation();
  return {
    mutateAsync: async (voucherId: string) => {
      try {
        const data = await trigger(Number(voucherId)).unwrap();
        toast.success("Voucher claimed! 🎉");
        return data as ClaimedVoucher;
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to claim voucher");
        throw e;
      }
    },
    isPending: state.isLoading,
  };
}

export function useCreateVoucher() {
  const [trigger, state] = useCreateVoucherMutation();
  return {
    mutateAsync: async (
      voucher: Omit<Voucher, "id" | "user_id" | "created_at" | "updated_at" | "status">
    ) => {
      try {
        const businessId = (voucher as any).business_card_id || (voucher as any).business_id;
        const original = (voucher as any).original_price ?? 0;
        const discounted = (voucher as any).discounted_price ?? 0;
        const discountValue = Math.max(0, Number(original) - Number(discounted));
        const payload = {
          business_id: businessId ? Number(businessId) : undefined,
          title: (voucher as any).title,
          description: (voucher as any).subtitle || (voucher as any).terms || undefined,
          discount_type: "flat",
          discount_value: discountValue,
          max_claims: (voucher as any).max_claims,
          expires_at: (voucher as any).expires_at,
        } as any;
        delete payload.business_card_id;
        const data = await trigger(payload).unwrap();
        toast.success("Voucher created!");
        return data as Voucher;
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to create voucher");
        throw e;
      }
    },
    isPending: state.isLoading,
  };
}

export function useTransferVoucher() {
  const [trigger, state] = useTransferVoucherMutation();
  return {
    mutate: async (
      {
        voucherId,
        recipientPhone,
      }: {
        voucherId: string;
        recipientPhone: string;
      },
      options?: { onSuccess?: () => void; onError?: (e: any) => void }
    ) => {
      try {
        const data = await trigger({
          voucher_id: Number(voucherId),
          recipient_phone: recipientPhone,
        }).unwrap();
        toast.success("Voucher transferred successfully! 🎁");
        options?.onSuccess?.();
        return data;
      } catch (e: any) {
        toast.error(e?.data?.error || e?.message || "Failed to transfer voucher");
        options?.onError?.(e);
        throw e;
      }
    },
    isPending: state.isLoading,
  };
}

export interface VoucherTransfer {
  id: string;
  claimed_voucher_id: string;
  voucher_id: string;
  sender_id: string;
  recipient_id: string;
  sender_phone: string | null;
  recipient_phone: string | null;
  created_at: string;
}

export function useVoucherTransfers() {
  const result = useGetVoucherTransfersQuery();
  return {
    ...result,
    data: (result.data || []) as VoucherTransfer[],
  };
}
