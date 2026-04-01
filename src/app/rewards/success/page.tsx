'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, Coins, ArrowRight, Loader2, DollarSign } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'

function SuccessContent() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, loading: authLoading } = useAuth()
  const { profile, refetch } = useProfile(user?.id)
  const searchParams = useSearchParams()
  const router = useRouter()

  const [coins, setCoins] = useState<number | null>(null)
  const [verifying, setVerifying] = useState(true)
  const [isDeposit, setIsDeposit] = useState(false)

  // Detect which flow: PaymentIntent (deposit) vs Checkout Session (old coin packages)
  const paymentIntentId = searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!paymentIntentId && !sessionId) {
      router.push('/rewards')
      return
    }

    const verify = async () => {
      try {
        if (paymentIntentId) {
          // New deposit flow via Payment Element
          setIsDeposit(true)
          if (redirectStatus !== 'succeeded') {
            throw new Error('Payment was not successful')
          }
          const res = await fetch('/api/deposit/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId }),
          })
          const data = await res.json()
          if (data.coins) setCoins(data.coins)
        } else if (sessionId) {
          // Legacy Stripe Checkout flow
          const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`)
          const data = await res.json()
          if (data.coins) setCoins(data.coins)
        }
      } catch {
        // Still show success page — balance may have been credited via webhook
      } finally {
        setVerifying(false)
        refetch()
      }
    }

    verify()
  }, [paymentIntentId, sessionId, redirectStatus])

  const currentCoins = profile?.balance || 0
  const depositDollars = coins ? (coins / 100).toFixed(2) : null

  if (verifying || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-500 text-sm uppercase tracking-widest font-black">Confirming payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden flex flex-col items-center relative pb-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-md w-full mx-auto px-4 py-16 relative z-10 flex flex-col items-center text-center space-y-8">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shadow-[0_0_40px_rgba(61,225,0,0.3)]">
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className={`absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${isDeposit ? 'bg-green-400' : 'bg-yellow-400'}`}
          >
            {isDeposit
              ? <DollarSign className="w-4 h-4 text-black" />
              : <Coins className="w-4 h-4 text-black" />
            }
          </motion.div>
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-primary">
            {isDeposit ? 'Funds Added!' : 'Purchase Complete!'}
          </h1>
          {coins !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-1"
            >
              {depositDollars && (
                <p className="text-3xl font-black text-green-400">+${depositDollars} added</p>
              )}
            </motion.div>
          )}
          <p className="text-zinc-400 text-sm">
            Your funds have been added to your account. Start trading!
          </p>
        </motion.div>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 w-full"
        >
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Your Balance</p>
          <div className="flex items-center justify-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-black">${(currentCoins / 100).toFixed(2)}</span>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 w-full"
        >
          <button
            onClick={() => router.push('/rewards')}
            className="flex items-center justify-center gap-2 bg-primary text-black font-black uppercase tracking-wider py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            View Rewards
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/rewards/buy')}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 font-semibold text-sm py-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            Add More Funds
          </button>
        </motion.div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
