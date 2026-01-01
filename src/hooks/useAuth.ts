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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      setLoading(false)

      if (requireAuth && event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [requireAuth, router])

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push('/login')
    }
  }, [loading, requireAuth, user, router])

  return { user, loading }
}
