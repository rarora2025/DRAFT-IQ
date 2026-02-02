'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Sparkles, Star, Trophy, Gift, CheckCircle2, Coins, Clock, ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MILESTONES = [
  { coins: 2000, reward: '$20 Gift Card', icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  { coins: 1500, reward: 'Draft Gold', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/20' },
  { coins: 1000, reward: 'Draft Silver', icon: Star, color: 'text-slate-300', bg: 'bg-slate-300/20' },
  { coins: 500, reward: 'Draft Bronze', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/20' },
  { coins: 0, reward: 'Draft Rookie', icon: Coins, color: 'text-blue-400', bg: 'bg-blue-400/20' },
]

export default function RewardsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user } = useAuth()
  const { profile, refetch } = useProfile(user?.id)
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
        {/* Header */}
        <div className="space-y-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="relative inline-block"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
            <img src={LOGO_URL} alt="IQ" className="w-24 h-24 mx-auto rounded-3xl shadow-2xl shadow-primary/20 relative z-10" />
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display font-black text-5xl sm:text-7xl uppercase tracking-tighter italic"
            >
              Rewards
            </motion.h1>
            <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent w-24 mx-auto" />
          </div>
        </div>

        {/* Daily Claim Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative max-w-md mx-auto"
        >
          <div className="bg-[#020420]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 shadow-xl">
            <div className="flex items-center gap-3 bg-white/5 rounded-full px-6 py-2 border border-white/10">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-display font-black text-xl italic">{currentCoins.toLocaleString()} DRAFT COINS</span>
            </div>
            
            <Button
              onClick={handleClaim}
              disabled={!canClaim || isClaiming}
              className={`w-full h-14 rounded-2xl font-black uppercase tracking-wider text-lg shadow-lg shadow-primary/20 transition-all active:scale-95 ${
                canClaim 
                ? 'bg-primary hover:bg-primary/90 text-white' 
                : 'bg-white/5 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isClaiming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Claiming...
                </div>
              ) : canClaim ? (
                'Claim Daily 50 Coins'
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Claimed Today
                </div>
              )}
            </Button>
            
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
              Daily claim resets every 24 hours
            </p>
          </div>
        </motion.div>

        {/* Rewards Ladder */}
        <div className="relative pt-12">
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
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary via-blue-400 to-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              />
            </div>

            {/* Milestones */}
            <div className="space-y-16 relative">
              {MILESTONES.map((m, i) => {
                const isReached = currentCoins >= m.coins
                const isTarget = m.coins === 2000
                
                return (
                  <motion.div
                    key={m.coins}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`flex items-center gap-8 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Milestone Card */}
                    <div className={`flex-1 group relative`}>
                      <div className={`absolute inset-0 ${m.bg} rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                      <div className={`relative bg-[#020420]/80 backdrop-blur-md border ${isReached ? 'border-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10'} rounded-3xl p-6 transition-all group-hover:-translate-y-1`}>
                        <div className={`flex items-center gap-4 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-12 h-12 rounded-2xl ${m.bg} flex items-center justify-center border border-white/10`}>
                            <m.icon className={`w-6 h-6 ${m.color}`} />
                          </div>
                          <div className={`text-left ${i % 2 === 0 ? '' : 'text-right'}`}>
                            <h3 className={`font-black uppercase tracking-tight ${isReached ? 'text-white' : 'text-zinc-500'}`}>
                              {m.reward}
                            </h3>
                            <p className="text-primary text-xs font-bold">{m.coins.toLocaleString()} Coins</p>
                          </div>
                          {isReached && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </div>
                        {isTarget && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                              Reach 2,000 to redeem for a $20 Amazon or Visa Gift Card
                            </p>
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

        {/* Footer info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]"
        >
          DraftIQ • Rewards Program • Beta v1.0
        </motion.p>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
