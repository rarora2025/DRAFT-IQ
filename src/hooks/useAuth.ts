'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!mounted) return

        if (error) {
          console.error('Error getting user:', error)
          setUser(null)
        } else {
          setUser(user)
        }
      } catch (err) {
        console.error('Auth error:', err)
        setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      console.log('Auth event:', event)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      // Only stop loading once we've had at least one auth event or initial check
      setLoading(false)

      // Only redirect on SIGNED_OUT, not on initial load if we're still checking
      if (requireAuth && event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [requireAuth, router])

  // Separate effect for redirect to avoid race conditions with loading state
  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push('/login')
    }
  }, [loading, requireAuth, user, router])

  return { user, loading }
}
