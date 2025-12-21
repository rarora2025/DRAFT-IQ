'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Clock, ChevronRight, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { getTeamLogoUrl } from '@/lib/team-utils'

interface Game {
  id: string
  sport: 'NFL' | 'NBA'
  home_team: string
  away_team: string
  game_time: string
  status: 'upcoming' | 'live' | 'completed'
  home_score: string
  away_score: string
  sport_key: string
}

export default function MarketsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

    useEffect(() => {
      fetchGames()
      const interval = setInterval(fetchGames, 30000) // Increase from 10s to 30s
      return () => clearInterval(interval)
    }, [])

    async function fetchGames() {
      try {
        const response = await fetch(`/api/games`)
        const data = await response.json()
        setGames(data.games || [])
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setLoading(false)
      }
    }

  const convertToEST = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-white mb-2 font-display">Projection Trading</h1>
            <p className="text-zinc-400">Trade on player props for NBA & NFL games</p>
          </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">Loading games...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/markets/${game.id}?sport=${game.sport_key}`}
                className="block"
              >
                <div className="bg-[#111116] border border-[#27272a] rounded-xl p-6 hover:border-emerald-500/50 transition-all hover:bg-[#1c1c24] group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 uppercase tracking-wider">
                        {game.sport}
                      </div>
                      {game.status === 'live' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                            LIVE
                          </span>
                        </div>
                      )}
                      {game.status === 'upcoming' && (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">
                            {convertToEST(game.game_time)}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getTeamLogoUrl(game.away_team, game.sport)} 
                              alt={game.away_team}
                              className="w-8 h-8 object-contain"
                              onError={(e) => (e.target as HTMLImageElement).style.visibility = 'hidden'}
                            />
                            <span className="text-zinc-200 font-medium">{game.away_team}</span>
                          </div>
                          {game.status === 'live' && (
                            <span className="text-xl font-bold text-white tabular-nums">
                              {game.away_score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getTeamLogoUrl(game.home_team, game.sport)} 
                              alt={game.home_team}
                              className="w-8 h-8 object-contain"
                              onError={(e) => (e.target as HTMLImageElement).style.visibility = 'hidden'}
                            />
                            <span className="text-zinc-200 font-medium">{game.home_team}</span>
                          </div>
                          {game.status === 'live' && (
                            <span className="text-xl font-bold text-white tabular-nums">
                              {game.home_score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                  <div className="mt-6 pt-4 border-t border-[#27272a]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Trophy className="w-4 h-4 text-emerald-500/50" />
                        <span>View Props</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-widest">TRADING OPEN</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center py-20 bg-[#111116] border border-[#27272a] border-dashed rounded-2xl">
            <Trophy className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No live games available</p>
          </div>
        )}
      </div>
      
      <Navbar isDark={true} />
    </div>
  )
}
