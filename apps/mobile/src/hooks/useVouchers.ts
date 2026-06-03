import { useDispatch } from "react-redux";
import { toast } from "../lib/toast";
import { baseApi } from "../store/api/baseApi";
import { useAppLocation } from "../contexts/LocationContext";
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
  code: string | null;
  category: string;
  original_price: number;
  discounted_price: number;
  discount_label: string | null;
  is_popular: boolean;
  allows_installment: boolean;
  upfront_amount: number | null;
  expires_at: string | null;
  max_claims: number | null;
  terms: string | null;
  company_name: string | null;
  phone_number: string | null;
  address: string | null;
  addresses: string[];
  city: string | null;
  pincode: string | null;
  voucher_image: string | null;
  voucher_banner: string | null;
  what_we_do: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  marketed_by_instantlly: boolean;
  gst_type: "including_gst" | "extra_gst" | null;
  booking_email: string | null;
  voucher_start_no: number | null;
  voucher_end_no: number | null;
  status: string;
  claimed_count: number;
  image_url: string | null;
  banner_url: string | null;
  min_claim: number | null;
  business_promotion_owner_id?: number | null;
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
  quantity: number;
  redeemed_count: number;
  serial_nos: number[];
  is_owner_gifted: boolean;
  owner_transfer?: {
    id: number;
    voucher_id: number;
    quantity: number;
    pay_now: number;
    pay_later: number;
    pay_barter: number;
    total_amount: number;
    transferred_at: string;
    sender?: { id: number; name: string | null; phone: string | null } | null;
  } | null;
  installment_status: string | null;
  remaining_balance: number | null;
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
  // Compact label for the badge pill (kept short so it fits in cards).
  // The "with code" context is communicated separately in the UI via the
  // `code` field — the badge stays tight: "50% OFF" / "₹500 OFF".
  const pct = original > 0 && discounted >= 0 && discounted < original
    ? Math.round(((original - discounted) / original) * 100)
    : 0;
  // Only emit a discount label when there is an actual discount. Showing
  // "0% OFF" or "₹0 OFF" is misleading, so leave it null in that case.
  const label: string | null = pct > 0
    ? `${pct}% OFF`
    : dValue > 0
      ? (dType === "percent" ? `${dValue}% OFF` : `₹${dValue} OFF`)
      : null;
  return {
    id: String(v.id),
    user_id: String(v.owner_user_id ?? v.user_id ?? ""),
    business_promotion_id: v.business_promotion_id ? String(v.business_promotion_id) : null,
    business_id: v.business_id ? String(v.business_id) : null,
    title: v.title,
    subtitle: v.subtitle ?? v.description ?? null,
    code: v.code ?? null,
    category: v.category ?? "",
    original_price: original,
    discounted_price: discounted,
    discount_label: label,
    is_popular: Boolean(v.is_popular),
    allows_installment: Boolean(v.allows_installment),
    upfront_amount: v.upfront_amount !== undefined && v.upfront_amount !== null ? Number(v.upfront_amount) : null,
    expires_at: v.expires_at ?? null,
    max_claims: v.max_claims ?? null,
    terms: v.terms ?? v.description ?? null,
    company_name: v.company_name ?? null,
    phone_number: v.phone_number ?? null,
    address: v.address ?? null,
    addresses: Array.isArray(v.addresses) && v.addresses.length > 0 ? v.addresses : (v.address ? [v.address] : []),
    city: v.city ?? null,
    pincode: v.pincode ?? null,
    voucher_image: v.voucher_image ?? null,
    voucher_banner: v.voucher_banner ?? null,
    what_we_do: v.what_we_do ?? null,
    website: v.website ?? null,
    instagram: v.instagram ?? null,
    facebook: v.facebook ?? null,
    youtube: v.youtube ?? null,
    marketed_by_instantlly: Boolean(v.marketed_by_instantlly),
    gst_type: v.gst_type === "including_gst" || v.gst_type === "extra_gst" ? v.gst_type : null,
    booking_email: v.booking_email ?? null,
    voucher_start_no: v.voucher_start_no != null ? Number(v.voucher_start_no) : null,
    voucher_end_no: v.voucher_end_no != null ? Number(v.voucher_end_no) : null,
    status: v.status ?? "active",
    claimed_count: Number(v.claimed_count ?? 0),
    image_url: v.image_url ?? v.voucher_image ?? null,
    banner_url: v.banner_url ?? v.voucher_banner ?? (Array.isArray(v.voucher_images) && v.voucher_images.length > 0 ? v.voucher_images[0] : null),
    min_claim: v.min_claim ?? null,
    business_promotion_owner_id: v.business_promotion?.user_id ?? null,
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

export function useVouchers(opts?: { nearMe?: boolean; limit?: number }) {
  const { city } = useAppLocation();
  const nearMe = opts?.nearMe ?? true;
  const limit = opts?.limit ?? 200;
  const result = useListVouchersQuery(
    { page: 1, limit, city: nearMe && city ? city : undefined },
    { refetchOnMountOrArgChange: true }
  );
  return {
    ...result,
    data: (result.data?.data || []).map(mapVoucher) as Voucher[],
  };
}

export function useVoucher(id: string) {
  const voucherId = Number(id);
  const result = useGetVoucherQuery(voucherId, { skip: !voucherId, refetchOnMountOrArgChange: true });
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
      quantity: Number(c.quantity ?? 1),
      redeemed_count: Number(c.redeemed_count ?? 0),
      serial_nos: Array.isArray(c.serial_nos) ? c.serial_nos.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)) : [],
      is_owner_gifted: Boolean(c.is_owner_gifted),
      owner_transfer: c.owner_transfer
        ? {
            id: Number(c.owner_transfer.id),
            voucher_id: Number(c.owner_transfer.voucher_id),
            quantity: Number(c.owner_transfer.quantity ?? 0),
            pay_now: Number(c.owner_transfer.pay_now ?? 0),
            pay_later: Number(c.owner_transfer.pay_later ?? 0),
            pay_barter: Number(c.owner_transfer.pay_barter ?? 0),
            total_amount: Number(c.owner_transfer.total_amount ?? 0),
            transferred_at: c.owner_transfer.transferred_at,
            sender: c.owner_transfer.sender ?? null,
          }
        : null,
      installment_status: c.installment_status ?? null,
      remaining_balance: c.remaining_balance != null ? Number(c.remaining_balance) : null,
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
    mutateAsync: async (voucherId: string, opts?: { quantity?: number }) => {
      try {
        const id = Number(voucherId);
        const data = await trigger(opts?.quantity ? { id, quantity: opts.quantity } : id).unwrap();
        const qty = opts?.quantity ?? 1;
        toast.success(qty > 1 ? `${qty} vouchers claimed! 🎉` : "Voucher claimed! 🎉");
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
          subtitle: (voucher as any).subtitle || undefined,
          code: (voucher as any).code || undefined,
          description: (voucher as any).description || undefined,
          discount_type: discountType,
          discount_value: discountValue,
          original_price: Number(original) > 0 ? Number(original) : undefined,
          min_claim: (voucher as any).min_claim,
          max_claims: (voucher as any).max_claims,
          expires_at: (voucher as any).expires_at,
          terms: (voucher as any).terms || undefined,
          company_name: (voucher as any).company_name || undefined,
          phone_number: (voucher as any).phone_number || undefined,
          address: (voucher as any).address || undefined,
          city: (voucher as any).city || undefined,
          pincode: (voucher as any).pincode || undefined,
          voucher_image: (voucher as any).voucher_image || undefined,
          voucher_banner: (voucher as any).voucher_banner || undefined,
          what_we_do: (voucher as any).what_we_do || undefined,
          website: (voucher as any).website || undefined,
          instagram: (voucher as any).instagram || undefined,
          marketed_by_instantlly: (voucher as any).marketed_by_instantlly === true,
          voucher_start_no: (voucher as any).voucher_start_no !== undefined && (voucher as any).voucher_start_no !== null && (voucher as any).voucher_start_no !== "" ? Number((voucher as any).voucher_start_no) : undefined,
          voucher_end_no: (voucher as any).voucher_end_no !== undefined && (voucher as any).voucher_end_no !== null && (voucher as any).voucher_end_no !== "" ? Number((voucher as any).voucher_end_no) : undefined,
          allows_installment: Boolean((voucher as any).allows_installment),
          upfront_amount: (voucher as any).allows_installment ? Number((voucher as any).upfront_amount) : undefined,
          is_popular: Boolean((voucher as any).is_popular),
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
  const dispatch = useDispatch();
  return {
    mutate: async (
      {
        voucherId,
        recipientPhone,
        quantity,
      }: {
        voucherId: string;
        recipientPhone: string;
        quantity?: number;
      },
      options?: { onSuccess?: () => void; onError?: (e: any) => void; onStaleClaim?: () => void }
    ) => {
      try {
        const data = await trigger({
          voucher_id: Number(voucherId),
          recipient_phone: recipientPhone,
          quantity,
        }).unwrap();
        toast.success("Voucher transferred successfully! 🎁");
        options?.onSuccess?.();
        return data;
      } catch (e: any) {
        const status = e?.status;
        const serverMsg: string = e?.data?.error || e?.message || "";
        const isStaleClaim =
          status === 409 &&
          /ownership changed|already.*owns|already has this voucher/i.test(serverMsg);

        if (isStaleClaim) {
          // Refresh the vouchers list so the UI reflects current ownership.
          dispatch(baseApi.util.invalidateTags(["Voucher"]));
          toast.error(
            "This voucher is no longer available to transfer. We refreshed your list — please try again."
          );
          options?.onStaleClaim?.();
        } else {
          toast.error(serverMsg || "Failed to transfer voucher");
        }
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
  voucher?: {
    id: string;
    title: string;
    business_name?: string;
    image?: string | null;
    discount_label?: string;
  };
  sender_name?: string;
  recipient_name?: string;
  quantity: number;
}

export function useVoucherTransfers() {
  const result = useGetVoucherTransfersQuery();
  return {
    ...result,
    data: (result.data || []).map((t: any) => {
      const v = t.voucher;
      let discount_label: string | undefined;
      if (v) {
        const dv = Number(v.discount_value ?? 0);
        if (dv > 0) {
          discount_label =
            v.discount_type === "percent" ? `${dv}% OFF` : `₹${dv} OFF`;
        }
      }
      const image =
        v?.voucher_image ||
        (Array.isArray(v?.voucher_images) && v.voucher_images.length ? v.voucher_images[0] : null) ||
        v?.company_logo ||
        null;
      return {
        id: String(t.id),
        voucher_id: String(t.voucher_id),
        sender_id: String(t.sender_id),
        recipient_id: String(t.recipient_id),
        sender_phone: t.sender_phone,
        recipient_phone: t.recipient_phone,
        transferred_at: t.transferred_at,
        voucher: v
          ? {
              id: String(v.id),
              title: v.title,
              business_name: v.business_name,
              image,
              discount_label,
            }
          : undefined,
        sender_name: t.sender?.name,
        recipient_name: t.recipient?.name,
        quantity: Number(t.quantity ?? 1),
      } as VoucherTransfer;
    }),
  };
}
