'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const initialCheckDone = useRef(false)

  useEffect(() => {
    let mounted = true

    const checkUser = async () => {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (mounted) {
          if (error) {
            console.log('Auth check error (likely no session):', error.message)
            setUser(null)
          } else {
            setUser(currentUser)
          }
          initialCheckDone.current = true
          setLoading(false)
        }
      } catch (error) {
        console.error('Error checking user:', error)
        if (mounted) {
          setUser(null)
          initialCheckDone.current = true
          setLoading(false)
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          if (!initialCheckDone.current) {
            initialCheckDone.current = true
            setLoading(false)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          if (!initialCheckDone.current) {
            initialCheckDone.current = true
            setLoading(false)
          }
        } else if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            setUser(session.user)
          }
          if (!initialCheckDone.current) {
            initialCheckDone.current = true
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      const publicPaths = ['/login', '/signup', '/auth/callback', '/']
      if (!publicPaths.includes(pathname)) {
        console.log('Redirecting to login - no user found')
        router.push('/login')
      }
    }
  }, [loading, requireAuth, user, router, pathname])

  return { user, loading }
}
