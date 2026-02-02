'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Loader2, ArrowRight, Sparkles, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Navbar } from '@/components/Navbar'

export function JoinClient() {
  const router = useRouter()
    const searchParams = useSearchParams()
    const codeFromUrl = (
      searchParams.get('code') || 
      searchParams.get('CODE') || 
      searchParams.get('invite') || 
      searchParams.get('INVITE') ||
      searchParams.get('inviteCode') ||
      ''
    ).toUpperCase()
    const { user, loading: authLoading } = useAuth(false)
    const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";
    
    const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [checkingEnrollment, setCheckingEnrollment] = useState(true)
    const [isValidCode, setIsValidCode] = useState<boolean | null>(null)
    const [validatedCode, setValidatedCode] = useState<string | null>(null)
    const [validatingCode, setValidatingCode] = useState(false)
  
    useEffect(() => {
      if (codeFromUrl) {
        validateCode(codeFromUrl)
      } else if (searchParams.has('code') || searchParams.has('CODE')) {
        // If param exists but is empty
        setIsValidCode(false)
      } else {
        // No code param at all
        setIsValidCode(null)
      }
    }, [codeFromUrl, searchParams])
  
    const validateCode = async (code: string) => {
      setValidatingCode(true)
      try {
        const res = await fetch(`/api/contest/validate-code?code=${encodeURIComponent(code)}`)
        const data = await res.json()
        setIsValidCode(data.valid)
        if (data.valid && data.code) {
          setValidatedCode(data.code)
        }
        if (!data.valid) {
          setError('The invitation code in your link is invalid or expired.')
        }
      } catch (err) {
        console.error('Error validating code:', err)
        setIsValidCode(false)
      } finally {
        setValidatingCode(false)
      }
    }

    useEffect(() => {
      if (!authLoading && !user) {
        // Redirect to signup if not logged in
        const currentPath = window.location.pathname + window.location.search
        const redirectPath = `/signup?redirectTo=${encodeURIComponent(currentPath)}`
        router.push(redirectPath)
        return
      }

    if (user) {
      checkEnrollment()
    } else if (!authLoading) {
      setCheckingEnrollment(false)
    }
  }, [user, authLoading, codeFromUrl])

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
      setLoading(true)
      setError('')
      
      try {
        const response = await fetch('/api/contest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'AUTO' }) // Send a dummy code for backend compatibility if needed
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
            <header className="text-center space-y-6 pt-12 flex flex-col items-center">
              <img src={LOGO_URL} alt="DraftIQ" className="w-24 h-24 sm:w-32 sm:h-32 object-contain" />
              <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tighter leading-[0.95] uppercase">
                Join the <br />
                <span className="text-primary italic">Playoff Challenge</span>
              </h1>

            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest max-w-[280px] mx-auto pt-1">
              Trade NFL markets • Win daily prizes
            </p>
          </header>

        {/* Main Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group"
        >
            <div className="space-y-8 relative z-10">
                {/* Action */}
              <div className="space-y-6 pt-4">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[11px] font-bold uppercase text-center flex items-center justify-center gap-2">
                     <X className="w-4 h-4" /> {error}
                  </div>
                )}

                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full pt-4">
                      <Button
                        onClick={handleJoin}
                        disabled={loading}
                        className={`w-full h-18 py-8 font-display font-black text-2xl rounded-[1.5rem] uppercase tracking-widest shadow-xl group/btn transition-all duration-300 bg-primary hover:bg-primary/90 text-[#020420] shadow-primary/20 scale-[1.02] hover:scale-[1.05]`}
                      >
                        {loading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-3">
                            Enter Challenge <ArrowRight className="w-7 h-7 transition-transform group-hover:translate-x-1" />
                          </span>
                        )}
                      </Button>
                    </div>
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
