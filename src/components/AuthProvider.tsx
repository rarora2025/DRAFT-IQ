'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

    useEffect(() => {
      const initializeAuth = async () => {
        try {
          const { data: { session: initialSession } } = await supabase.auth.getSession()
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          
          if (initialSession?.user) {
            // Log app open for existing session
            fetch('/api/v1-metrics/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventName: 'app_open',
                userId: initialSession.user.id,
                properties: {
                  email: initialSession.user.email,
                  source: 'initial_load'
                }
              })
            }).catch(err => console.error('Failed to log app open:', err))
          }
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
    
          if (event === 'SIGNED_IN' && currentSession?.user) {
            // Log user logon
            fetch('/api/v1-metrics/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventName: 'user_logon',
                userId: currentSession.user.id,
                properties: {
                  email: currentSession.user.email,
                  last_sign_in: currentSession.user.last_sign_in_at
                }
              })
            }).catch(err => console.error('Failed to log user logon:', err))
          }

          if (event === 'SIGNED_OUT') {
            router.push('/login')
          }
        })


    return () => {
      subscription.unsubscribe()
    }
  }, [router])

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
