'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, Wallet } from 'lucide-react'
import { AuthFlow } from '@/components/AuthFlow'
import { useEffect } from 'react'
import { useAuthContext } from '@/components/AuthProvider'

function SignupContent() {
  const searchParams = useSearchParams()
  const { user, loading } = useAuthContext()
  const redirectTo = '/markets'

  useEffect(() => {
    if (!loading && user) {
      window.location.href = redirectTo
    }
  }, [user, loading, redirectTo])

    const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/logo-1770054185242.png?width=8000&height=8000&resize=contain";

    if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-32 h-32 rounded-3xl overflow-hidden mb-2"
          >
            <img src={LOGO_URL} alt="DraftIQ" className="w-full h-full object-contain" />
          </motion.div>
        </div>
        <p className="text-zinc-400 font-medium tracking-wide">Trade player projections. Beat the market.</p>
      </div>

      <AuthFlow mode="signup" redirectTo={redirectTo} />

      <p className="text-center text-sm text-zinc-500 font-medium">
        Already have an account?{' '}
        <Link 
          href="/login" 
          className="text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4">
      <React.Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <SignupContent />
      </React.Suspense>

    </div>
  )
}
