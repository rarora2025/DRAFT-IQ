'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthSecurity() {
  useEffect(() => {
    // 1. Clear session tokens from URL fragments/params after Supabase processes them
    const cleanUrl = () => {
      if (typeof window === 'undefined') return

      const hash = window.location.hash
      const search = window.location.search

      const sensitiveParams = ['access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'code']
      const hasSensitiveHash = sensitiveParams.some(p => hash.includes(`${p}=`))
      const hasSensitiveSearch = sensitiveParams.some(p => search.includes(`${p}=`))

      if (hasSensitiveHash || hasSensitiveSearch) {
        // Wait a tiny bit to ensure Supabase Auth has grabbed the tokens
        setTimeout(() => {
          const url = new URL(window.location.href)
          
          // Clear hash fragments
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
          
          // Clear query params
          sensitiveParams.forEach(p => url.searchParams.delete(p))
          url.searchParams.delete('type') // Often used with recovery
          
          if (url.search !== window.location.search) {
            window.history.replaceState(null, '', url.pathname + url.search)
          }
        }, 500)
      }
    }

    // 2. Listen for auth changes to trigger cleanup
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        cleanUrl()
      }
    })

    // Initial check
    cleanUrl()

    return () => subscription.unsubscribe()
  }, [])

  return null
}
