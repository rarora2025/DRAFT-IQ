'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LeaderboardUser {
  id: string
  username: string
  balance: number
  total_value: number
  percent_gain: number
  rank: number
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const isDark = true
  
    const fetchLeaderboard = async () => {
      const { data: leaderboardData, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .order('total_value', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching leaderboard:', error)
        return
      }

      if (leaderboardData) {
        const processedData = leaderboardData.map((p, index) => ({
          id: p.id,
          username: p.username,
          balance: Number(p.balance),
          total_value: Number(p.total_value),
          percent_gain: ((Number(p.total_value) - 1000) / 1000) * 100,
          rank: index + 1,
        }))
        setLeaderboard(processedData)
      }
      setLoading(false)
      setLastUpdated(new Date())
    }

    useEffect(() => {
      fetchLeaderboard()
      
      const interval = setInterval(fetchLeaderboard, 30000) // Auto refresh every 30s
      return () => clearInterval(interval)
    }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 text-center font-mono text-sm text-zinc-500">{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/20'
    if (rank === 2) return 'bg-zinc-500/10 border-zinc-500/20'
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/20'
    return 'bg-[#111116] border-[#27272a]'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-8">
          <header className="text-center relative">
            <div className="absolute right-0 top-0">
              <button 
                onClick={() => {
                  setLoading(true)
                  fetchLeaderboard()
                }}
                className="p-3 rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-all shadow-lg"
                title="Refresh"
              >
                <TrendingUp className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500/10 text-yellow-400 mb-6 border border-yellow-500/20 shadow-lg shadow-yellow-500/5">
              <Trophy className="w-5 h-5" />
                <span className="font-display font-black text-sm uppercase tracking-widest">Leaderboard</span>
            </div>
            <h1 className="font-display font-black text-4xl text-white tracking-tight uppercase">Top <span className="text-primary italic">Traders</span></h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-bold mt-2">
              Sync: {lastUpdated.toLocaleTimeString()}
            </p>
          </header>

        <Tabs defaultValue="value" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border p-1 rounded-2xl h-14">
            <TabsTrigger 
              value="value" 
              className="font-display font-bold uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all h-full"
            >
              By Value
            </TabsTrigger>
            <TabsTrigger 
              value="percent" 
              className="font-display font-bold uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all h-full"
            >
              By % Gain
            </TabsTrigger>
          </TabsList>

          <TabsContent value="value" className="mt-6 space-y-4">
            {leaderboard
              .sort((a, b) => b.total_value - a.total_value)
              .map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl p-5 border transition-all hover:bg-card/80 ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-primary shadow-xl shadow-primary/10' : 'bg-card border-border'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border font-black text-lg">
                      {getRankIcon(index + 1)}
                    </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-lg text-white">
                          {entry.username}
                          {entry.id === user?.id && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded">You</span>
                          )}
                        </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cash: ${Math.round(entry.balance)}</span>
                            <div className="w-1 h-1 rounded-full bg-border" />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${entry.percent_gain >= 0 ? 'text-primary' : 'text-red-400'}`}>
                              {entry.percent_gain >= 0 ? '+' : ''}{entry.percent_gain.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Portfolio</p>
                          <p className="font-mono font-black text-xl text-primary">${Math.round(entry.total_value).toLocaleString()}</p>
                        </div>

                  </div>
                </motion.div>
              ))}
          </TabsContent>

          <TabsContent value="percent" className="mt-6 space-y-4">
            {leaderboard
              .sort((a, b) => b.percent_gain - a.percent_gain)
              .map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl p-5 border transition-all hover:bg-card/80 ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-primary shadow-xl shadow-primary/10' : 'bg-card border-border'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border">
                      {getRankIcon(index + 1)}
                    </div>
                      <div className="flex-1">
                          <p className="font-display font-bold text-lg text-white">
                            {entry.username}
                            {entry.id === user?.id && (
                              <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded">You</span>
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">${Math.round(entry.total_value).toLocaleString()} Total Value</p>
                        </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">ROI</p>
                      <div className={`flex items-center justify-end gap-1 font-mono font-black text-xl ${entry.percent_gain >= 0 ? 'text-primary' : 'text-red-400'}`}>
                        {entry.percent_gain >= 0 && <TrendingUp className="w-5 h-5 shadow-sm" />}
                        {entry.percent_gain >= 0 ? '+' : ''}{entry.percent_gain.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </TabsContent>
        </Tabs>

        {leaderboard.length === 0 && (
          <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
            <Trophy className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">No traders yet. Be the first to join!</p>
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
