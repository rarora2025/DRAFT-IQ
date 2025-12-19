'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Clock, ChevronRight, Activity } from 'lucide-react'

interface Game {
  id: string
  sport: 'NFL' | 'NBA'
  home_team: string
  away_team: string
  game_time: string
  status: 'upcoming' | 'live' | 'completed'
  home_score: number
  away_score: number
}

export default function MarketsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchGames() {
    try {
      const response = await fetch(`/api/games?sport=NBA`)
      const data = await response.json()
      setGames(data.games || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">NBA Live Markets</h1>
          <p className="text-zinc-400">Trade on player props for live NBA games</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">Loading games...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/markets/${game.id}?sport=${game.sport}`}
                className="block"
              >
                <div className="bg-[#111116] border border-[#27272a] rounded-xl p-6 hover:border-emerald-500/50 transition-colors group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {game.status === 'live' && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-semibold text-red-400 uppercase">
                            LIVE
                          </span>
                        </div>
                      )}
                      {game.status === 'upcoming' && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">
                            {new Date(game.game_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {game.sport}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-medium">{game.away_team}</span>
                        {game.status !== 'upcoming' && (
                          <span className="text-2xl font-bold text-white tabular-nums">
                            {game.away_score}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{game.home_team}</span>
                        {game.status !== 'upcoming' && (
                          <span className="text-2xl font-bold text-white tabular-nums">
                            {game.home_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Trophy className="w-4 h-4" />
                      <span>View Player Props</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No games available</p>
          </div>
        )}
      </div>
    </div>
  )
}
