'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          setInitialized(true)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
          setInitialized(true)
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setUser(session?.user ?? null)
        
        if (!initialized) {
          setInitialized(true)
          setLoading(false)
        }

        if (event === 'SIGNED_IN') {
          router.refresh()
        }
        
        if (event === 'SIGNED_OUT') {
          router.refresh()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, initialized])

  useEffect(() => {
    if (initialized && !loading && requireAuth && !user) {
      const publicPaths = ['/login', '/signup', '/auth/callback', '/']
      if (!publicPaths.includes(pathname)) {
        router.push('/login')
      }
    }
  }, [initialized, loading, requireAuth, user, router, pathname])

  return { user, loading: !initialized || loading }
}
