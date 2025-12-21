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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
          <header className="text-center relative">
            <div className="absolute right-0 top-0">
              <button 
                onClick={() => {
                  setLoading(true)
                  fetchLeaderboard()
                }}
                className="p-2 rounded-lg bg-[#111116] border border-[#27272a] text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Refresh"
              >
                <TrendingUp className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-400 mb-4 border border-yellow-500/20">
              <Trophy className="w-5 h-5" />
              <span className="font-display font-bold">Leaderboard</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-zinc-100">Top Traders</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </header>

        <Tabs defaultValue="value" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#111116] border border-[#27272a]">
            <TabsTrigger 
              value="value" 
              className="font-display data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
            >
              By Value
            </TabsTrigger>
            <TabsTrigger 
              value="percent" 
              className="font-display data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400"
            >
              By % Gain
            </TabsTrigger>
          </TabsList>

          <TabsContent value="value" className="mt-4 space-y-3">
            {leaderboard
              .sort((a, b) => b.total_value - a.total_value)
              .map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl p-4 border ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold text-zinc-200">
                        {entry.username}
                        {entry.id === user?.id && (
                          <span className="ml-2 text-xs text-emerald-400">(You)</span>
                        )}
                      </p>
                      <p className={`text-xs ${entry.percent_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.percent_gain >= 0 ? '+' : ''}{entry.percent_gain.toFixed(1)}% gain
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lg text-zinc-100">${entry.total_value.toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
          </TabsContent>

          <TabsContent value="percent" className="mt-4 space-y-3">
            {leaderboard
              .sort((a, b) => b.percent_gain - a.percent_gain)
              .map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-xl p-4 border ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold text-zinc-200">
                        {entry.username}
                        {entry.id === user?.id && (
                          <span className="ml-2 text-xs text-emerald-400">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500">${entry.total_value.toFixed(0)} value</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 font-mono font-bold text-lg ${entry.percent_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.percent_gain >= 0 && <TrendingUp className="w-4 h-4" />}
                        {entry.percent_gain >= 0 ? '+' : ''}{entry.percent_gain.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </TabsContent>
        </Tabs>

        {leaderboard.length === 0 && (
          <div className="rounded-xl p-8 text-center bg-[#111116] border border-[#27272a] text-zinc-500">
            No traders yet. Be the first to join!
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
