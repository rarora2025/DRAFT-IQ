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
  updated_at?: string
}

export default function MarketsPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

    const getTimeAgo = (dateStr?: string) => {
      if (!dateStr) return null;
      const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      return `${Math.floor(minutes / 60)}h ago`;
    };

    useEffect(() => {
      fetchGames()
      const interval = setInterval(fetchGames, 15000) // 15s interval
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
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
            <div className="mb-10 text-center sm:text-left">
                  <h1 className="text-4xl sm:text-5xl font-bold mb-3 font-display tracking-tight text-white uppercase italic leading-tight">
                    Trade on <span className="text-primary NOT-italic">player performance</span>
                  </h1>
                </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/markets/${game.id}?sport=${game.sport_key}`}
                className="block"
              >
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all hover:bg-accent/30 group">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground uppercase tracking-wider">
                          {game.sport}
                        </div>
                        {game.status === 'live' && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                              LIVE
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">
                            {convertToEST(game.game_time)}
                          </span>
                        </div>
                      </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
                            <span className="text-foreground font-medium">{game.away_team}</span>
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
                            <span className="text-foreground font-medium">{game.home_team}</span>
                          </div>
                          {game.status === 'live' && (
                            <span className="text-xl font-bold text-white tabular-nums">
                              {game.home_score}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trophy className="w-4 h-4 text-primary/50" />
                          <span>View Props</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          {game.updated_at && (
                            <span className="text-[10px] font-mono font-bold text-primary/60 uppercase tracking-tight">
                              Updated {new Date(game.updated_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>

                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center py-20 bg-card border border-border border-dashed rounded-2xl">
            <Trophy className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted-foreground">No live games available</p>
          </div>
        )}
      </div>
      
      <Navbar isDark={true} />
    </div>
  )
}
