import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format số tiền VND, vd 45000 -> "45.000 ₫" */
export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

/** Format calo, vd 320 -> "320 kcal" */
export function formatCalories(calories: number): string {
  return `${Math.round(calories)} kcal`;
}
