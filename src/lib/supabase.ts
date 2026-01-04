'use client'

import { createBrowserClient } from '@supabase/ssr'

const getCookieDomain = () => {
  if (typeof window === 'undefined') return undefined
  const hostname = window.location.hostname
  if (hostname.includes('draftiq.app')) {
    return '.draftiq.app'
  }
  return undefined
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      domain: getCookieDomain(),
      path: '/',
      sameSite: 'lax',
      secure: true,
    }
  }
)
