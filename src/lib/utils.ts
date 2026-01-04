import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getURL() {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ??
    process?.env?.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3001'

  // Make sure to include `https://` when not localhost
  url = url.includes('http') ? url : `https://${url}`
  // Remove trailing slash if present to avoid doubles
  url = url.endsWith('/') ? url.slice(0, -1) : url
  
  return `${url}/`
}

export function isMarketLocked(status: string | undefined | null): boolean {
  if (!status) return false
  const s = status.toUpperCase()
  return s === 'LOCKED' || s === 'FROZEN' || s === 'SETTLED' || s === 'INACTIVE'
}
