'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Sparkles, Star, Trophy, Gift, CheckCircle2, Coins, Clock, ChevronRight, ShoppingBag } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const MILESTONES = [
  { coins: 2000, reward: '$20 Gift Card', icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
]

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
  const progressPercent = Math.min((currentCoins / 2000) * 100, 100)

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
                <Coins className="w-6 h-6 text-yellow-400" />
                <span className="font-display font-black text-2xl italic tracking-tight">{Math.round(currentCoins).toLocaleString()} DRAFT COINS</span>
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

        {/* Rewards Ladder */}
        <div className="relative pt-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-12 flex items-center justify-center gap-4">
            <Trophy className="w-8 h-8 text-primary" />
            Milestone Ladder
            <Trophy className="w-8 h-8 text-primary" />
          </h2>

          <div className="relative max-w-lg mx-auto px-4">
            {/* Ladder Track */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                className="absolute top-0 left-0 right-0 bg-gradient-to-b from-primary via-blue-400 to-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              />
            </div>

            {/* Milestones */}
            <div className="space-y-16 relative">
                {MILESTONES.map((m, i) => {
                  const isReached = currentCoins >= m.coins
                  
                  return (
                    <motion.div
                      key={m.coins}
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-8"
                    >
                      {/* Milestone Card */}
                        <div className="flex-1 group relative">
                          <div className={`absolute inset-0 ${m.bg} rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                          <div className={`relative bg-[#020420]/80 backdrop-blur-md border ${isReached ? 'border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10'} rounded-3xl p-6 transition-all group-hover:-translate-y-1`}>
                            <div className="flex flex-col items-center gap-2">
                              <h3 className={`font-black text-4xl italic tracking-tighter ${isReached ? 'text-white' : 'text-zinc-500'}`}>
                                $20
                              </h3>
                              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-relaxed">
                                Reach 2,000 Draft Coins to redeem for a $20 Amazon or Visa Gift Card
                              </p>
                            </div>
                            {isReached && (
                              <div className="absolute top-4 right-4">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              </div>
                            )}
                          </div>
                        </div>

                      {/* Node on Ladder */}
                      <div className="relative z-10 w-12 h-12 flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full border-2 ${isReached ? 'bg-primary border-primary shadow-[0_0_10px_#3b82f6]' : 'bg-background border-white/20'}`} />
                        {isReached && (
                          <motion.div
                            layoutId="active-node"
                            className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
                          />
                        )}
                      </div>

                      <div className="flex-1" />
                    </motion.div>
                  )
                })}
            </div>
          </div>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
