import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCr(value: number) {
  const precision = Math.abs(value) > 0 && Math.abs(value) < 1 ? 2 : 1;
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: precision, maximumFractionDigits: precision })} Cr`;
}

export function formatLakh(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L`;
}
