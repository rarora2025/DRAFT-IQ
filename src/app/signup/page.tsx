'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2, Wallet } from 'lucide-react'
import { AuthFlow } from '@/components/AuthFlow'

function SignupForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || searchParams.get('redirect') || '/'

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
        <p className="text-zinc-400 font-medium tracking-wide">The next generation of player prop trading.</p>
      </div>

      <AuthFlow mode="signup" redirectTo={redirectTo} />

      <div className="bg-[#020420]/50 border border-white/10 rounded-3xl p-6 text-center space-y-2 relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Starting Capital</p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <p className="font-mono font-black text-4xl text-primary">$1,000</p>
        </div>
        <p className="text-xs text-zinc-600 font-medium">Claim your free virtual coins to start trading</p>
      </div>

      <p className="text-center text-sm text-zinc-500 font-medium">
        Already have an account?{' '}
        <Link 
          href={`/login${redirectTo !== '/' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} 
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
      <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
