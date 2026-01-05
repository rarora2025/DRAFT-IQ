'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, CheckCircle, Loader2, ArrowRight, Wallet, TrendingUp, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')?.toUpperCase()
  const { user, loading: authLoading } = useAuth(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [checkingEnrollment, setCheckingEnrollment] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to signup if not logged in
      const redirectPath = code ? `/signup?redirectTo=${encodeURIComponent(`/join?code=${code}`)}` : '/signup'
      router.push(redirectPath)
      return
    }

    if (user) {
      checkEnrollment()
    } else if (!authLoading) {
      setCheckingEnrollment(false)
    }
  }, [user, authLoading, code])

  const checkEnrollment = async () => {
    try {
      const res = await fetch('/api/contest/leaderboard')
      const data = await res.json()
      if (data.overall) {
        const enrolled = data.overall.some((p: any) => p.user_id === user?.id)
        if (enrolled) {
          setIsAlreadyEnrolled(true)
          // If already enrolled, just take them to leaderboard after a brief moment
          setTimeout(() => router.push('/leaderboard'), 2000)
        }
      }
    } catch (err) {
      console.error('Error checking enrollment:', err)
    } finally {
      setCheckingEnrollment(false)
    }
  }

  const handleJoin = async () => {
    if (!code) {
      setError('No join code provided')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      
      if (data.success) {
        router.push('/leaderboard')
      } else {
        setError(data.error || 'Failed to join challenge')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || checkingEnrollment) {
    return (
      <div className="min-h-screen bg-[#020420] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAlreadyEnrolled) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-black text-white mb-2">YOU&apos;RE IN!</h1>
        <p className="text-zinc-400 mb-8">You are already a participant in the challenge.</p>
        <p className="text-xs text-zinc-500 animate-pulse">Redirecting to leaderboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020420] text-white pb-24">
      <div className="max-w-lg mx-auto px-4 pt-12 space-y-8">
        
        {/* Header Section */}
        <header className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-2"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Exclusive Invite
            </span>
          </motion.div>
          
          <h1 className="font-display font-black text-4xl sm:text-5xl text-white tracking-tighter leading-none uppercase">
            Join the <br />
            <span className="text-primary italic">Kalshi x DraftIQ</span> <br />
            Playoff Challenge
          </h1>

          <p className="text-zinc-400 text-sm max-w-[280px] mx-auto leading-relaxed">
            Trade NFL playoff markets, climb the leaderboard, and win daily prizes.
          </p>
        </header>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full -mr-16 -mt-16" />
          
          <div className="space-y-8 relative z-10">
            {/* Branding */}
            <div className="flex flex-col items-center border-b border-white/5 pb-8">
               <div className="relative w-32 h-10 mb-2">
                <Image 
                  src="/sponsors/kalshi.webp" 
                  alt="Kalshi" 
                  fill 
                  className="object-contain"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">Official Partner</p>
            </div>

            {/* Features */}
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide">Starting Capital</h3>
                  <p className="text-xs text-zinc-500">Everyone starts with $1,000 in virtual trading credits.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide">Daily Prizes</h3>
                  <p className="text-xs text-zinc-500">The top trader each playoff day wins exclusive rewards.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0 border border-yellow-500/20">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wide">Playoff Glory</h3>
                  <p className="text-xs text-zinc-500">Cement your status as the #1 prop trader on DraftIQ.</p>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="space-y-4 pt-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold uppercase text-center flex items-center justify-center gap-2">
                   <X className="w-3 h-3" /> {error}
                </div>
              )}

              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">
                  Using Code: <span className="text-primary font-mono">{code || '---'}</span>
                </p>
                <Button
                  onClick={handleJoin}
                  disabled={loading || !code}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-[#020420] font-display font-black text-xl rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 group/btn"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Enter Challenge <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[10px] text-zinc-600 font-medium px-8 leading-relaxed">
          By joining, you agree to the challenge rules and terms. Daily prizes are awarded based on daily percentage returns.
        </p>

      </div>
      <Navbar isDark={true} />
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020420] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <JoinContent />
    </Suspense>
  )
}
