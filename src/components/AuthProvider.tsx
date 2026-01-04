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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (_event === 'SIGNED_IN') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
