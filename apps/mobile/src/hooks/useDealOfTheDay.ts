import { useMemo } from "react";
import { useVouchers } from "./useVouchers";

export function useDealOfTheDay() {
  const { data: vouchers, isLoading, error } = useVouchers();

  const deal = useMemo(() => {
    const active = (vouchers ?? []).filter(
      (v: any) => v.status === "active" && v.original_price > 0
    );
    if (active.length === 0) return null;

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const sorted = [...active].sort((a: any, b: any) => {
      const discA = ((a.original_price - a.discounted_price) / a.original_price) * 100;
      const discB = ((b.original_price - b.discounted_price) / b.original_price) * 100;
      return discB - discA;
    });
    return sorted[dayOfYear % sorted.length];
  }, [vouchers]);

  return { data: deal, isLoading, error };
}
