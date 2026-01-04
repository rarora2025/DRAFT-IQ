'use client'

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      domain: typeof window !== 'undefined' ? window.location.hostname.replace('www.', '') : undefined,
      path: '/',
      sameSite: 'lax',
      secure: true,
    }
  }
)
