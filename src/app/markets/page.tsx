'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Clock, ChevronRight, Loader2, Sun, Moon, Play } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { fetchGames } from '@/lib/sportsData'
import type { Game } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function MarketsPage() {
  const { user, loading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'NBA' | 'NFL'>('all')
  const router = useRouter()
  const isDark = theme === 'dark'

  useEffect(() => {
    const loadGames = async () => {
      const data = await fetchGames()
      setGames(data)
      setLoading(false)
    }

    loadGames()

    // Refresh games every 30 seconds
    const interval = setInterval(loadGames, 30000)

    return () => clearInterval(interval)
  }, [])

  const filteredGames = filter === 'all' 
    ? games 
    : games.filter(g => g.sport === filter)

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Starting Soon'
    if (diffHours < 24) return `${diffHours}h`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
        <header className="flex items-center justify-between">
          <div>
            <h1 className={`font-display font-bold text-2xl ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
              Live Markets
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Trade on player projections
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:bg-[#1c1c24]' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </header>

        <div className={`flex gap-2 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-1`}>
          {(['all', 'NBA', 'NFL'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All Sports' : f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredGames.length === 0 ? (
            <div className={`rounded-xl p-8 text-center ${isDark ? 'bg-[#111116] border border-[#27272a] text-zinc-500' : 'bg-white border border-gray-200 text-gray-500'}`}>
              No games available. Check back later!
            </div>
          ) : (
            filteredGames.map((game, index) => (
              <motion.button
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/markets/${game.id}`)}
                className={`w-full rounded-xl p-4 text-left transition-all ${isDark ? 'bg-[#111116] border border-[#27272a] hover:border-emerald-500/30' : 'bg-white border border-gray-200 hover:border-emerald-500/50 shadow-sm'} ${game.is_live ? 'ring-2 ring-red-500/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-md text-xs font-bold ${
                      game.sport === 'NBA' 
                        ? 'bg-orange-500/20 text-orange-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {game.sport}
                    </div>
                    {game.is_live && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-xs font-bold">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </div>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                    <Clock className="w-3 h-3" />
                    {formatTime(game.commence_time)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                      {game.away_team}
                    </span>
                    {game.is_live && game.away_score !== undefined && (
                      <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                        {game.away_score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                      {game.home_team}
                    </span>
                    {game.is_live && game.home_score !== undefined && (
                      <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                        {game.home_score}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDark ? 'border-[#27272a]' : 'border-gray-200'}`}>
                  <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    View Player Props
                  </span>
                  <ChevronRight className={`w-5 h-5 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} />
                </div>
              </motion.button>
            ))
          )}
        </div>

        <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              How It Works
            </span>
          </div>
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            Select a game to browse live player prop projections. Trade OVER or UNDER on stats like points, yards, and more. Projections update every 5 seconds based on live data scraping.
          </p>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
