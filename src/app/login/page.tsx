'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { AuthFlow } from '@/components/AuthFlow'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthContext } from '@/components/AuthProvider'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuthContext()
  const redirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '/markets'

    useEffect(() => {
      if (!loading && user) {
        router.replace(redirectTo)
      }
    }, [user, loading, redirectTo, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="relative w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-24 h-24 rounded-2xl overflow-hidden mb-2"
          >
            <img src="/logo.png" alt="DraftIQ" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="font-display font-black text-5xl text-white tracking-tighter">
            DraftIQ
          </h1>
        </div>
        <p className="text-zinc-400 font-medium tracking-wide">Trade player projections. Beat the market.</p>
      </div>

      <AuthFlow mode="login" redirectTo={redirectTo} />

      <p className="text-center text-sm text-zinc-500 font-medium">
        Don&apos;t have an account?{' '}
        <Link 
          href={`/signup${redirectTo !== '/markets' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} 
          className="text-primary hover:underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4">
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
