'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session) {
          router.refresh()
        }
        
        if (event === 'SIGNED_OUT') {
          router.refresh()
          if (requireAuth) {
            router.push('/login')
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [checkUser, requireAuth, router])

  useEffect(() => {
    if (!loading && requireAuth && !user && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login')
    }
  }, [loading, requireAuth, user, router, pathname])

  return { user, loading }
}
