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
      const publicPaths = ['/login', '/signup', '/auth/callback', '/']
      if (!publicPaths.includes(pathname)) {
        console.log('[useAuth] Redirecting to login - no user, pathname:', pathname)
        router.push('/login')
      }
    }
  }, [loading, requireAuth, user, router, pathname])

  return { user, loading, supabase }
}
