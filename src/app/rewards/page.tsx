'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, ShoppingBag } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function RewardsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user } = useAuth()
  const { profile, refetch } = useProfile(user?.id)
  const router = useRouter()
  const [isClaiming, setIsClaiming] = useState(false)
  const [canClaim, setCanClaim] = useState(false)

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  useEffect(() => {
    if (profile?.last_claim_at) {
      const lastClaim = new Date(profile.last_claim_at)
      const now = new Date()
      const isSameDay = lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
                        lastClaim.getUTCMonth() === now.getUTCMonth() &&
                        lastClaim.getUTCDate() === now.getUTCDate()
      setCanClaim(!isSameDay)
    } else {
      setCanClaim(true)
    }
  }, [profile])

  const handleClaim = async () => {
    if (!user?.id || !canClaim || isClaiming) return

    setIsClaiming(true)
    try {
      const res = await fetch('/api/iq/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim')

      toast.success('Claimed 50 Draft Coins!', {
        description: 'Come back tomorrow for more!',
      })
      refetch()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsClaiming(false)
    }
  }

  const currentCoins = profile?.balance || 0

  return (
    <div className="min-h-screen bg-background pb-32 text-white overflow-x-hidden flex flex-col items-center relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-4xl w-full mx-auto px-4 py-8 space-y-12 text-center relative z-10">
        {/* Balance Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative max-w-md mx-auto"
          >
          <div className="flex items-center justify-center gap-3 bg-white/5 backdrop-blur-xl rounded-full px-8 py-4 border border-white/10 shadow-xl">
                <DollarSign className="w-6 h-6 text-green-400" />
                <span className="font-display font-black text-2xl italic tracking-tight">${(currentCoins / 100).toFixed(2)} BALANCE</span>
              </div>
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                onClick={() => router.push('/rewards/buy')}
                className="mt-3 flex items-center gap-2 mx-auto bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 font-bold text-sm uppercase tracking-wider px-5 py-2.5 rounded-full transition-all hover:scale-105"
              >
                <ShoppingBag className="w-4 h-4" />
                Add Funds
              </motion.button>
          </motion.div>

      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
