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
  business_promotion_id: string | null;
  business_id: string | null;
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
  claimed_count: number;
  promotion?: {
    id: string;
    business_name: string;
    tier: string;
    status: string;
    payment_status: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimedVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  status: string;
  claimed_at: string;
  redeemed_at: string | null;
  voucher?: Voucher;
}

const mapVoucher = (v: any): Voucher => {
  // Backend now decorates rows with computed `original_price`, `discounted_price`,
  // `discount_label`. Prefer those when present, otherwise fall back to legacy fields.
  const dType = v.discount_type === "percent" ? "percent" : "flat";
  const dValue = Number(v.discount_value ?? 0);
  const original = v.original_price !== undefined && v.original_price !== null
    ? Number(v.original_price)
    : Number(v.mrp ?? v.amount ?? 0);
  const discounted = v.discounted_price !== undefined && v.discounted_price !== null
    ? Number(v.discounted_price)
    : original > 0
      ? dType === "percent"
        ? Math.max(0, original - (original * dValue) / 100)
        : Math.max(0, original - dValue)
      : 0;
  const label = v.discount_label
    ?? (dType === "percent" ? `${dValue}% OFF` : `₹${dValue} OFF`);
  return {
    id: String(v.id),
    user_id: String(v.owner_user_id ?? v.user_id ?? ""),
    business_promotion_id: v.business_promotion_id ? String(v.business_promotion_id) : null,
    business_id: v.business_id ? String(v.business_id) : null,
    title: v.title,
    subtitle: v.description ?? null,
    category: v.category ?? "",
    original_price: original,
    discounted_price: discounted,
    discount_label: label,
    is_popular: Boolean(v.is_popular),
    expires_at: v.expires_at ?? null,
    max_claims: v.max_claims ?? null,
    terms: v.description ?? null,
    status: v.status ?? "active",
    claimed_count: Number(v.claimed_count ?? 0),
    promotion: v.business_promotion
      ? {
          id: String(v.business_promotion.id),
          business_name: v.business_promotion.business_name,
          tier: v.business_promotion.tier,
          status: v.business_promotion.status,
          payment_status: v.business_promotion.payment_status,
        }
      : null,
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
      id: String(c.id),
      user_id: String(c.user_id),
      voucher_id: String(c.voucher_id),
      status: c.status || (c.redeemed_at ? "redeemed" : "active"),
      claimed_at: c.claimed_at,
      redeemed_at: c.redeemed_at ?? null,
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
    mutateAsync: async (voucher: any) => {
      try {
        const businessPromotionId = voucher.business_promotion_id ?? voucher.promotion_id;
        if (!businessPromotionId) {
          throw new Error("business_promotion_id is required");
        }

        const original = (voucher as any).original_price ?? 0;
        const discounted = (voucher as any).discounted_price ?? 0;
        // Prefer percent discount when an original price is present so the UI
        // shows "X% OFF" instead of "₹X OFF".
        const explicitType = (voucher as any).discount_type as string | undefined;
        const explicitValue = (voucher as any).discount_value;
        let discountType: string;
        let discountValue: number;
        if (explicitType && explicitValue !== undefined && explicitValue !== null) {
          discountType = explicitType;
          discountValue = Number(explicitValue);
        } else if (Number(original) > 0 && Number(discounted) >= 0 && Number(discounted) <= Number(original)) {
          discountType = "percent";
          discountValue = Math.round(((Number(original) - Number(discounted)) / Number(original)) * 100);
        } else {
          discountType = "flat";
          discountValue = Math.max(0, Number(original) - Number(discounted));
        }

        const payload = {
          business_promotion_id: Number(businessPromotionId),
          title: (voucher as any).title,
          code: (voucher as any).code || undefined,
          description: (voucher as any).subtitle || (voucher as any).terms || undefined,
          discount_type: discountType,
          discount_value: discountValue,
          original_price: Number(original) > 0 ? Number(original) : undefined,
          max_claims: (voucher as any).max_claims,
          expires_at: (voucher as any).expires_at,
        } as any;
        const data = await trigger(payload).unwrap();
        toast.success("Voucher created!");
        return mapVoucher(data) as Voucher;
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
  voucher_id: string;
  sender_id: string;
  recipient_id: string;
  sender_phone: string;
  recipient_phone: string;
  transferred_at: string;
}

export function useVoucherTransfers() {
  const result = useGetVoucherTransfersQuery();
  return {
    ...result,
    data: (result.data || []).map((t: any) => ({
      id: String(t.id),
      voucher_id: String(t.voucher_id),
      sender_id: String(t.sender_id),
      recipient_id: String(t.recipient_id),
      sender_phone: t.sender_phone,
      recipient_phone: t.recipient_phone,
      transferred_at: t.transferred_at,
    })) as VoucherTransfer[],
  };
}
