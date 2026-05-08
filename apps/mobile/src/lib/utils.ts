import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with Indian-style grouping (lakh / crore).
 *   1000   -> "1,000"
 *   100000 -> "1,00,000"
 *   10000000 -> "1,00,00,000"
 * Hermes does not implement locale-aware `toLocaleString("en-IN")`,
 * so we group manually.
 */
export function formatINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  const n = Number(value);
  if (!isFinite(n)) return "0";
  const negative = n < 0;
  const abs = Math.abs(n);
  const [intPartRaw, decPart] = abs.toString().split(".");
  let intPart = intPartRaw;
  let grouped: string;
  if (intPart.length <= 3) {
    grouped = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  const out = decPart ? `${grouped}.${decPart}` : grouped;
  return negative ? `-${out}` : out;
}
