'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/components/AuthProvider'

export function useAuth(requireAuth = true) {
  const { user, loading, supabase } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      const publicPaths = ['/login', '/signup', '/']
        if (!publicPaths.includes(pathname)) {
          console.log('[useAuth] Redirecting to login - no user, pathname:', pathname)
          const redirectTo = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?redirectTo=${redirectTo}`)
        }
    }
  }, [loading, requireAuth, user, router, pathname])

  return { user, loading, supabase }
}
