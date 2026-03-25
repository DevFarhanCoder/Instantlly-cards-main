import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

export function useVouchers() {
  return useQuery({
    queryKey: ["vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Voucher[];
    },
  });
}

export function useVoucher(id: string) {
  return useQuery({
    queryKey: ["voucher", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Voucher;
    },
    enabled: !!id,
  });
}

export function useMyVouchers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-claimed-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claimed_vouchers")
        .select("*, voucher:vouchers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        voucher: d.voucher as Voucher,
      })) as ClaimedVoucher[];
    },
    enabled: !!user,
  });
}

export function useMyCreatedVouchers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-created-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Voucher[];
    },
    enabled: !!user,
  });
}

export function useClaimVoucher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (voucherId: string) => {
      const code = `VCH-${voucherId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const { data, error } = await supabase
        .from("claimed_vouchers")
        .insert({ user_id: user!.id, voucher_id: voucherId, code })
        .select()
        .single();
      if (error) throw error;
      return data as ClaimedVoucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claimed-vouchers"] });
      toast.success("Voucher claimed! 🎉");
    },
    onError: (e: any) => toast.error(e.message || "Failed to claim voucher"),
  });
}

export function useCreateVoucher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (voucher: Omit<Voucher, "id" | "user_id" | "created_at" | "updated_at" | "status">) => {
      const { data, error } = await supabase
        .from("vouchers")
        .insert({ ...voucher, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Voucher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["my-created-vouchers"] });
      toast.success("Voucher created!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create voucher"),
  });
}

export function useTransferVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimedVoucherId, recipientPhone }: { claimedVoucherId: string; recipientPhone: string }) => {
      const { data, error } = await supabase.rpc("transfer_voucher", {
        p_claimed_voucher_id: claimedVoucherId,
        p_recipient_phone: recipientPhone,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Transfer failed");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claimed-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-transfers"] });
      toast.success("Voucher transferred successfully! 🎁");
    },
    onError: (e: any) => toast.error(e.message || "Failed to transfer voucher"),
  });
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["voucher-transfers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_transfers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VoucherTransfer[];
    },
    enabled: !!user,
  });
}
