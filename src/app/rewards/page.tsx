'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Gift, Users, Zap, Coins, CheckCircle2, ChevronRight, Share2, Loader2, ArrowUpRight, TrendingUp, AlertCircle, Clock, Star, Target } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { toast } from 'sonner'

interface RewardMilestone {
  iq: number
  reward: string
  description: string
  icon: any
  color: string
}

const MILESTONES: RewardMilestone[] = [
  { iq: 1000, reward: 'Starter Pack', description: 'Entry into the IQ society', icon: Star, color: 'text-zinc-400' },
  { iq: 2000, reward: '$10 Gift Card', description: 'Double your IQ to unlock', icon: Gift, color: 'text-primary' },
  { iq: 2500, reward: '$15 Xbox Card', description: 'The gamer special', icon: Zap, color: 'text-blue-400' },
  { iq: 5000, reward: '$30 Amazon Card', description: 'Elite trader status', icon: Target, color: 'text-orange-400' },
  { iq: 10000, reward: '$100 Cash Prize', description: 'The ultimate IQ score', icon: Trophy, color: 'text-yellow-400' }
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

  const currentProgress = (balance / 10000) * 100

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
            Climb the ladder. Earn real value.
          </p>
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
                <span className="font-mono font-black text-5xl sm:text-7xl text-white tracking-tighter tabular-nums">
                  {Math.round(balance).toLocaleString()}
                </span>
                <span className="text-primary font-black text-xl italic uppercase tracking-tighter">IQ</span>
              </div>
            </div>
            <div className="flex gap-4">
                <div className="text-center bg-background/50 border border-border rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Status</p>
                    <p className="text-sm font-black text-primary uppercase">Active</p>
                </div>
                <div className="text-center bg-background/50 border border-border rounded-2xl px-6 py-4">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Rank</p>
                    <p className="text-sm font-black text-white uppercase">SOCIETY</p>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Rewards Ladder */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">The IQ Ladder</h2>
            </div>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              {MILESTONES.filter(m => balance >= m.iq).length} / {MILESTONES.length} Unlocked
            </span>
          </div>

          <div className="relative space-y-4">
            {/* Progress Line */}
            <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-zinc-800 hidden sm:block">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${currentProgress}%` }}
                className="w-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              />
            </div>

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
                      <span className={`font-mono font-black text-sm tabular-nums ${isUnlocked ? 'text-primary' : 'text-zinc-600'}`}>
                        {milestone.iq.toLocaleString()} IQ
                      </span>
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

        {/* Challenges Section */}
        <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">IQ Multiplier Challenges</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invite Challenge */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ y: -5 }}
                    className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                +500 IQ
                            </span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-black text-lg text-white uppercase tracking-tight mb-2">Invite The Squad</h4>
                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            Refer 5 traders to the DraftIQ society. 
                            Progress: <span className="text-white font-black">{referralCount}/5</span>
                        </p>
                    </div>
                    <div className="pt-2">
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-4 border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((referralCount / 5) * 100, 100)}%` }}
                                className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                            />
                        </div>
                        <button 
                            onClick={copyReferralLink}
                            className="w-full flex items-center justify-center gap-2 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group-hover:border-blue-500/30 text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                            <Share2 className="w-4 h-4 text-blue-400" />
                            Copy Invite Link
                        </button>
                    </div>
                </motion.div>

                {/* Trade Challenge */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ y: -5 }}
                    className="bg-card border border-border rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                            <TrendingUp className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                                +250 IQ
                            </span>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-black text-lg text-white uppercase tracking-tight mb-2">Master the Market</h4>
                        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            Place a trade on <span className="text-yellow-400 font-bold">Luka Doncic</span> or <span className="text-yellow-400 font-bold">Patrick Mahomes</span> to unlock.
                        </p>
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={() => window.location.href = '/markets'}
                            className="w-full flex items-center justify-center gap-2 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group-hover:border-yellow-500/30 text-[10px] font-black uppercase tracking-[0.2em]"
                        >
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Go to Markets
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>

        {/* Penalty Warning */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-6 flex items-center gap-6"
        >
            <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
                <h5 className="font-black text-xs text-red-400 uppercase tracking-[0.2em] mb-1">Daily Activity Requirement</h5>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    Maintain your IQ. Missing a daily login results in a <span className="text-red-400 font-bold">-50 IQ</span> penalty. 
                    Login daily to protect your score and keep climbing.
                </p>
            </div>
        </motion.div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
