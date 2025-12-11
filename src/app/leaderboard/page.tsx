'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, Loader2, Sun, Moon } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/hooks/useTheme'

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
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

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
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className={`w-5 h-5 text-center font-mono text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/20'
    if (rank === 2) return isDark ? 'bg-zinc-500/10 border-zinc-500/20' : 'bg-gray-100 border-gray-200'
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/20'
    return isDark ? 'bg-[#111116] border-[#27272a]' : 'bg-white border-gray-200'
  }

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} pb-24`}>
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:bg-[#1c1c24]' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-400 mb-4 border border-yellow-500/20">
            <Trophy className="w-5 h-5" />
            <span className="font-display font-bold">Leaderboard</span>
          </div>
          <h1 className={`font-display font-bold text-2xl ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>Top Traders</h1>
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>2025 Competition</p>
        </header>

        <Tabs defaultValue="value" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200'}`}>
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
                      <p className={`font-display font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
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
                      <p className={`font-mono font-bold text-lg ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>${entry.total_value.toFixed(0)}</p>
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
                      <p className={`font-display font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                        {entry.username}
                        {entry.id === user?.id && (
                          <span className="ml-2 text-xs text-emerald-400">(You)</span>
                        )}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>${entry.total_value.toFixed(0)} value</p>
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
          <div className={`rounded-xl p-8 text-center ${isDark ? 'bg-[#111116] border border-[#27272a] text-zinc-500' : 'bg-white border border-gray-200 text-gray-500'}`}>
            No traders yet. Be the first to join!
          </div>
        )}
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}