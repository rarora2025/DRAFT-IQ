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

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, balance')
        .order('balance', { ascending: false })
        .limit(50)

      if (profiles) {
        const leaderboardData = profiles.map((p, index) => ({
          id: p.id,
          username: p.username,
          balance: Number(p.balance),
          total_value: Number(p.balance),
          percent_gain: ((Number(p.balance) - 1000) / 1000) * 100,
          rank: index + 1,
        }))
        setLeaderboard(leaderboardData)
      }
      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 text-center text-muted-foreground font-mono">{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
    if (rank === 2) return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30'
    return 'bg-white/5 border-white/10'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-radial from-yellow-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400 mb-4">
            <Trophy className="w-5 h-5" />
            <span className="font-display font-bold">Leaderboard</span>
          </div>
          <h1 className="font-display font-bold text-2xl">Top Traders</h1>
          <p className="text-sm text-muted-foreground">See who&apos;s winning the weather game</p>
        </header>

        <Tabs defaultValue="value" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="value" className="font-display">By Value</TabsTrigger>
            <TabsTrigger value="percent" className="font-display">By % Gain</TabsTrigger>
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
                  className={`glass rounded-xl p-4 border ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold">
                        {entry.username}
                        {entry.id === user?.id && (
                          <span className="ml-2 text-xs text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.percent_gain >= 0 ? '+' : ''}{entry.percent_gain.toFixed(1)}% gain
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg">${entry.total_value.toFixed(0)}</p>
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
                  className={`glass rounded-xl p-4 border ${getRankBg(index + 1)} ${entry.id === user?.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(index + 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold">
                        {entry.username}
                        {entry.id === user?.id && (
                          <span className="ml-2 text-xs text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">${entry.total_value.toFixed(0)} value</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 font-display font-bold text-lg ${entry.percent_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
          <div className="glass rounded-xl p-8 text-center text-muted-foreground">
            No traders yet. Be the first to join!
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}
