'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User, Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  supabase: SupabaseClient
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  supabase: supabase,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasRedirected = useRef(false)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
      } catch (error) {
        console.error('[AuthProvider] Initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && currentSession?.user && !hasRedirected.current) {
        const isAuthPage = pathname === '/login' || pathname === '/signup'
        if (isAuthPage) {
          hasRedirected.current = true
          const redirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '/markets'
          router.push(redirectTo)
          router.refresh()
        } else {
          router.refresh()
        }
      } else if (event === 'SIGNED_OUT') {
        hasRedirected.current = false
        router.refresh()
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname, searchParams])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
