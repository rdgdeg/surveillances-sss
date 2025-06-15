import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper sécurisé pour convertir string | number | null | undefined en number fiable.
 * Retourne 0 si la conversion n'est pas possible.
 */
export function safeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) return Number(value);
  return 0;
}
