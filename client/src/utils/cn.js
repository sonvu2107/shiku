import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function để merge Tailwind classes
 * Kết hợp clsx và tailwind-merge để xử lý conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

