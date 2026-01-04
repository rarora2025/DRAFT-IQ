'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useRef(createClient()).current

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
        } else {
          setUser(null)
        }
        
        setLoading(false)

        if (event === 'SIGNED_IN') {
          router.refresh()
        }
        
        if (event === 'SIGNED_OUT') {
          setUser(null)
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
  }, [checkUser, requireAuth, router, supabase])

  useEffect(() => {
    if (!loading && requireAuth && !user && pathname !== '/login' && pathname !== '/signup' && pathname !== '/auth/callback') {
      router.push('/login')
    }
  }, [loading, requireAuth, user, router, pathname])

  return { user, loading }
}
