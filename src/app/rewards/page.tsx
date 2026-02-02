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
  const [loading, setLoading] = useState(true)
  const [referralCount, setReferralCount] = useState(0)
  const isDark = theme === 'dark'

  const LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('balance, referral_count')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setBalance(data.balance || 0)
          setReferralCount(data.referral_count || 0)
        }
        setLoading(false)
      }
      fetchData()
    }
  }, [user, supabase])

  const copyReferralLink = () => {
    const link = `${window.location.origin}/join?ref=${user?.id}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied!')
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

  const currentProgress = Math.min((balance / 2000) * 100, 100)

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
            IQ <span className="text-primary">Rewards</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">
            Double your money. Get paid.
          </p>
        </div>

        {/* Daily Check-in Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-[2rem] p-6 flex items-center justify-between gap-6"
        >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
                  <Star className="w-6 h-6 text-primary" />
              </div>
              <div>
                  <h5 className="font-black text-xs text-primary uppercase tracking-[0.2em] mb-1">Daily Streak Bonus</h5>
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                      Keep your streak alive. Every daily check-in earns you <span className="text-primary font-bold">+50 IQ</span>. 
                      Stay active to maximize your score.
                  </p>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="px-6 py-3 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest">
                +50 IQ
              </div>
            </div>
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

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-[2.5rem] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-colors duration-700" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Current IQ Score</p>
                <div className="flex items-center gap-3">
                  <IQDisplay 
                    value={balance} 
                    valueClassName="text-5xl sm:text-7xl text-white tracking-tighter" 
                    iconClassName="w-12 h-12 sm:w-16 sm:h-16"
                  />
                </div>
            </div>
            <div className="flex gap-4">
                <div className="text-center bg-background/50 border border-border rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-primary uppercase">Active</p>
                </div>
                <div className="text-center bg-background/50 border border-border rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Rank</p>
                    <p className="text-sm font-black text-white uppercase">TRADER</p>
                </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
