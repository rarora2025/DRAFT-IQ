'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, Gift, Zap, Users, LogOut, CheckCircle2, Lock, 
  ArrowRight, Sparkles, Star, Loader2, Share2, TrendingUp,
  Coins, Wallet, Reward, GraduationCap, Target
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Milestone {
  points: number
  reward: string
  id: string
}

const MILESTONES: Milestone[] = [
  { id: '1', points: 1000, reward: '$5 Starbucks Card' },
  { id: '2', points: 2000, reward: '$10 Gift Card' },
  { id: '3', points: 2500, reward: '$15 Xbox Gift Card' },
  { id: '4', points: 5000, reward: '$30 Amazon Card' },
  { id: '5', points: 7500, reward: '$50 Visa Card' },
  { id: '6', points: 10000, reward: '$100 Cash Out' },
]

interface Challenge {
  id: string
  title: string
  description: string
  reward: number
  completed: boolean
  icon: any
}

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth()
  const [iqBalance, setIqBalance] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  const challenges: Challenge[] = [
    { 
      id: 'referral', 
      title: 'Growth Master', 
      description: 'Invite 5 friends with your link', 
      reward: 500, 
      completed: referralCount >= 5,
      icon: Users 
    },
    { 
      id: 'first_trade', 
      title: 'First Step', 
      description: 'Place your first trade', 
      reward: 100, 
      completed: true, // Placeholder logic
      icon: Zap 
    },
    { 
      id: 'daily_login', 
      title: 'Dedicated', 
      description: 'Log in for 3 consecutive days', 
      reward: 200, 
      completed: false, 
      icon: Star 
    }
  ]

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('portfolio_value, id')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setIqBalance(profile.portfolio_value)
        }

        // Fetch referral count
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', user.id)
        
        setReferralCount(count || 0)
      } catch (error) {
        console.error('Error fetching rewards data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) {
      fetchData()
    }
  }, [user, authLoading])

  const handleClaim = (milestone: Milestone) => {
    if (iqBalance < milestone.points) {
      toast.error('Not enough IQ points yet!')
      return
    }
    setClaiming(milestone.id)
    setTimeout(() => {
      toast.success(`Request submitted for ${milestone.reward}!`)
      setClaiming(null)
    }, 1500)
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/signup?ref=${user?.id}`
    navigator.clipboard.writeText(link)
    toast.success('Referral link copied to clipboard!')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Loading Rewards...</p>
      </div>
    )
  }

  const currentProgress = MILESTONES.find(m => m.points > iqBalance) || MILESTONES[MILESTONES.length - 1]
  const progressPercent = Math.min((iqBalance / currentProgress.points) * 100, 100)

  return (
    <div className="min-h-screen bg-[#020420] pb-24 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">IQ Rewards Program</span>
          </div>
          <h1 className="font-display font-black text-5xl text-white tracking-tighter uppercase italic">The Ladder</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Trade smart, earn points, get paid</p>
        </header>

        {/* Current Status */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Coins className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Your Current IQ</p>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <img src="/iq-logo.png" className="w-10 h-10 object-contain" alt="IQ" />
                <span className="text-5xl font-black font-mono tracking-tighter">{Math.round(iqBalance).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="w-full md:w-64 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-zinc-500">Next Milestone</span>
                <span className="text-primary">{currentProgress.points.toLocaleString()} IQ</span>
              </div>
              <div className="h-4 bg-white/5 border border-white/10 rounded-full overflow-hidden p-1">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                />
              </div>
              <p className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                {Math.round(currentProgress.points - iqBalance).toLocaleString()} IQ remaining for {currentProgress.reward}
              </p>
            </div>
          </div>
        </div>

        {/* The Ladder */}
        <div className="mb-12">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 px-2">
            <Reward className="w-4 h-4 text-primary" />
            Reward Milestones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MILESTONES.map((m, i) => {
              const isLocked = iqBalance < m.points
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "bg-white/5 border rounded-[1.5rem] p-6 transition-all relative overflow-hidden group",
                    isLocked ? "border-white/5 grayscale" : "border-primary/30 shadow-2xl shadow-primary/5"
                  )}
                >
                  {isLocked && (
                    <div className="absolute top-4 right-4">
                      <Lock className="w-4 h-4 text-zinc-700" />
                    </div>
                  )}
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{m.points.toLocaleString()} IQ</p>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">{m.reward}</h3>
                  <Button
                    onClick={() => handleClaim(m)}
                    disabled={isLocked || claiming === m.id}
                    className={cn(
                      "w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                      isLocked 
                        ? "bg-white/5 text-zinc-600 hover:bg-white/5 border border-white/5" 
                        : "bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/10"
                    )}
                  >
                    {claiming === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? 'Locked' : 'Claim Reward'}
                  </Button>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Challenges */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2 px-2">
            <Target className="w-4 h-4 text-primary" />
            Active Challenges
          </h2>
          <div className="space-y-4">
            {challenges.map((c, i) => {
              const Icon = c.icon
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                      c.completed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                    )}>
                      {c.completed ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">{c.title}</h3>
                      <p className="text-[11px] text-zinc-500 font-medium">{c.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <span className="text-sm font-black text-white">+{c.reward}</span>
                      <img src="/iq-logo.png" className="w-3.5 h-3.5 object-contain" alt="IQ" />
                    </div>
                    {c.id === 'referral' && !c.completed && (
                      <button 
                        onClick={handleCopyLink}
                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                      >
                        Copy Link
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
      <Navbar isDark={true} />
    </div>
  )
}
