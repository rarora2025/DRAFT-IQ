'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Gift, Users, Zap, Coins, CheckCircle2, ChevronRight, Share2, Loader2, ArrowUpRight, TrendingUp, AlertCircle, Clock, Star, Target } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { IQDisplay } from '@/components/IQDisplay'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RewardMilestone {
  iq: number
  reward: string
  description: string
  icon: any
  color: string
}

const MILESTONES: RewardMilestone[] = [
  { iq: 2000, reward: '$20 Cash Reward', description: '2x your money to unlock', icon: Trophy, color: 'text-primary' }
]

export default function RewardsPage() {
  const { user, loading: authLoading, supabase } = useAuth()
  const { theme } = useTheme()
  const [balance, setBalance] = useState<number>(0)
  const [lastClaimAt, setLastClaimAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [countdown, setCountdown] = useState('')
  const isDark = theme === 'dark'

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance, last_claim_at')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setBalance(data.balance || 0)
          setLastClaimAt(data.last_claim_at)
        }
        setLoading(false)
      }
      fetchData()
    }
  }, [user, supabase])

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastClaimAt) {
        const lastClaim = new Date(lastClaimAt)
        const nextClaim = new Date(lastClaim)
        nextClaim.setUTCDate(nextClaim.getUTCDate() + 1)
        nextClaim.setUTCHours(0, 0, 0, 0)

        const now = new Date()
        const diff = nextClaim.getTime() - now.getTime()

        if (diff <= 0) {
          setCountdown('')
        } else {
          const hours = Math.floor(diff / 3600000)
          const mins = Math.floor((diff % 3600000) / 60000)
          const secs = Math.floor((diff % 60000) / 1000)
          setCountdown(`${hours}h ${mins}m ${secs}s`)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lastClaimAt])

  const handleClaim = async () => {
    if (!user || claiming) return
    setClaiming(true)

    try {
      const res = await fetch('/api/iq/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      const data = await res.json()

      if (res.ok) {
        setBalance(data.newBalance)
        setLastClaimAt(data.lastClaimAt)
        setShowConfetti(true)
        toast.success('+50 IQ Claimed!')
        setTimeout(() => setShowConfetti(false), 3000)
      } else {
        toast.error(data.error || 'Failed to claim')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setClaiming(false)
    }
  }

  const isClaimedToday = () => {
    if (!lastClaimAt) return false
    const now = new Date()
    const lastClaim = new Date(lastClaimAt)
    return lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
           lastClaim.getUTCMonth() === now.getUTCMonth() &&
           lastClaim.getUTCDate() === now.getUTCDate()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-[20vh] gap-4">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-12 h-12 rounded-2xl border-2 border-primary border-t-transparent"
        />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Syncing Rewards Ladder...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32 text-white overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block"
          >
            <img src={LOGO_URL} alt="IQ" className="w-20 h-20 mx-auto rounded-3xl shadow-2xl shadow-primary/20 mb-4" />
          </motion.div>
          <h1 className="font-display font-black text-4xl sm:text-6xl uppercase tracking-tighter italic">
            Rewards
          </h1>
        </div>

        {/* Daily Check-in Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full" />
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                  <Star className="w-8 h-8 text-primary" />
              </div>
              <div>
                  <h5 className="font-black text-xs text-primary uppercase tracking-[0.2em] mb-1">Daily Streak Bonus</h5>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed max-w-xs">
                      Keep your streak alive. Every daily check-in earns you <span className="text-primary font-bold">+50 IQ</span>. 
                  </p>
              </div>
            </div>

            <div className="relative z-10 w-full sm:w-auto">
              {isClaimedToday() ? (
                <div className="text-center sm:text-right space-y-2">
                  <div className="px-8 py-3 bg-zinc-800 text-zinc-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Claimed
                  </div>
                  {countdown && (
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                      Next in {countdown}
                    </p>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full sm:w-auto px-10 py-6 bg-primary hover:bg-primary/90 text-black rounded-xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                >
                  {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Claim +50 IQ'}
                </Button>
              )}
            </div>

            {/* Confetti Animation Overlay */}
            <AnimatePresence>
              {showConfetti && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
                >
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                        rotate: Math.random() * 360
                      }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    exit={{ scale: 2, opacity: 0 }}
                    className="text-4xl font-black text-primary italic uppercase tracking-tighter"
                  >
                    +50 IQ
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
        </motion.div>

        {/* Rewards Ladder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">The IQ Goal</h2>
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {balance >= 2000 ? '1 / 1' : '0 / 1'} Unlocked
            </span>
          </div>

          <div className="relative space-y-4">
            {MILESTONES.map((milestone, index) => {
              const isUnlocked = balance >= milestone.iq
              const Icon = milestone.icon

              return (
                  <motion.div
                    key={milestone.iq}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  className={`relative flex items-center gap-6 p-4 sm:p-6 rounded-3xl border transition-all duration-500 group ${
                    isUnlocked 
                      ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5' 
                      : 'bg-card/50 border-border opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                  }`}
                >
                  <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform duration-500 group-hover:scale-110 ${
                    isUnlocked 
                      ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}>
                    <Icon className="w-7 h-7" />
                    {isUnlocked && (
                      <div className="absolute -top-2 -right-2 bg-primary text-black rounded-full p-1 shadow-lg">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-black text-xl uppercase tracking-tight ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                        {milestone.reward}
                      </h3>
                        <IQDisplay 
                          value={milestone.iq} 
                          valueClassName={cn("text-sm tabular-nums", isUnlocked ? 'text-primary' : 'text-zinc-600')}
                        />
                    </div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                      {milestone.description}
                    </p>
                  </div>

                  <div className="hidden sm:block">
                    {isUnlocked ? (
                      <button className="bg-primary hover:bg-primary/90 text-black text-[9px] font-black uppercase tracking-widest px-4 h-9 rounded-xl transition-all shadow-xl shadow-primary/10">
                        Claim Now
                      </button>
                    ) : (
                      <div className="px-4 h-9 rounded-xl border border-zinc-800 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-zinc-700" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/30 border border-white/5 border-dashed rounded-[2.5rem] p-12 text-center"
        >
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Zap className="w-8 h-8 text-zinc-700" />
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.3em] text-zinc-600">
            More rewards coming soon
          </p>
        </motion.div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
