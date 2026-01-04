'use client'

import { useEffect } from 'react'
import { useAuthContext } from '@/components/AuthProvider'

export function AuthSecurity() {
  const { supabase } = useAuthContext()
  
  useEffect(() => {
    const cleanUrl = () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      const search = window.location.search

      const sensitiveParams = ['access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'code']
      const hasSensitiveHash = sensitiveParams.some(p => hash.includes(`${p}=`))
      const hasSensitiveSearch = sensitiveParams.some(p => search.includes(`${p}=`))

      if (hasSensitiveHash || hasSensitiveSearch) {
        setTimeout(() => {
          const url = new URL(window.location.href)
          
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          
          sensitiveParams.forEach(p => url.searchParams.delete(p))
          url.searchParams.delete('type')
          
          if (url.search !== window.location.search) {
            window.history.replaceState(null, '', url.pathname + url.search)
          }
        }, 500)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        cleanUrl()
      }
    })

    cleanUrl()

    return () => subscription.unsubscribe()
  }, [supabase])

  return null
}
