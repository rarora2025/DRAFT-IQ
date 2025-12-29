import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMarketLocked(status: string | undefined | null): boolean {
  if (!status) return false
  const s = status.toUpperCase()
  return s === 'LOCKED' || s === 'FROZEN' || s === 'SETTLED' || s === 'INACTIVE'
}
