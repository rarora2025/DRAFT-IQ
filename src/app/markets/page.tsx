'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Trophy, Clock, ChevronRight, Activity, Search, X, User } from 'lucide-react'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { useOnboarding } from '@/components/OnboardingProvider'
import { useSearch } from '@/components/SearchProvider'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

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

interface SportsSettings {
  NBA: boolean
  NFL: boolean
}

export default function MarketsPage() {
  const { user } = useAuth(false)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const { query, setQuery, results, isSearching } = useSearch()

  useEffect(() => {
      fetchGames()
      const interval = setInterval(() => {
        fetchGames()
      }, 15000)
      return () => clearInterval(interval)
    }, [user])

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

    const filteredGames = useMemo(() => {
      let result = [...games].filter(game => game.status !== 'completed')
      
      if (query.length >= 2) {
        const lowerQuery = query.toLowerCase()
        result = result.filter(game => 
          game.home_team.toLowerCase().includes(lowerQuery) ||
          game.away_team.toLowerCase().includes(lowerQuery) ||
          game.sport.toLowerCase().includes(lowerQuery)
        )
      }

      return result.sort((a, b) => {
        // Live games always first
        if (a.status === 'live' && b.status !== 'live') return -1
        if (a.status !== 'live' && b.status === 'live') return 1
        
        // Then sort by game time
        const timeA = new Date(a.game_time).getTime()
        const timeB = new Date(b.game_time).getTime()
        if (timeA !== timeB) return timeA - timeB
        
        // Stable fallback: ID
        return a.id.localeCompare(b.id)
      })
    }, [games, query])

  const featuredGame = useMemo(() => {
    return filteredGames.find(g => 
      (g.home_team.toLowerCase().includes('patriots') && g.away_team.toLowerCase().includes('seahawks')) ||
      (g.home_team.toLowerCase().includes('seahawks') && g.away_team.toLowerCase().includes('patriots'))
    )
  }, [filteredGames])

  const displayGames = useMemo(() => {
    if (!featuredGame) return filteredGames
    return filteredGames.filter(g => g.id !== featuredGame.id)
  }, [filteredGames, featuredGame])

  const formatLocalTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

return (
<div className="min-h-screen bg-background text-white">
  {/* Sticky Top Search Bar - Expanded across screen */}
  <div className="sticky top-16 md:top-[104px] z-[100] w-full bg-background/60 backdrop-blur-xl border-b border-white/[0.05] py-3 sm:py-4 mb-4 sm:mb-6">
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8">
      <div className="relative group w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 group-focus-within:text-primary transition-colors" size={18} strokeWidth={2.5} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players, teams, or games..."
          className="w-full h-11 sm:h-12 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] rounded-xl sm:rounded-2xl pl-11 pr-10 text-sm sm:text-base text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all border border-white/5 group-hover:border-white/10 shadow-lg shadow-black/20"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {query.length >= 2 && (isSearching || results.length > 0 || filteredGames.length === 0) && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] overflow-hidden z-[100]"
            >
              <div className="max-h-[500px] overflow-y-auto p-3 custom-scrollbar">
                {isSearching ? (
                  <div className="py-20 text-center">
                    <Activity className="w-10 h-10 animate-spin text-primary mx-auto mb-4 opacity-50" />
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">Searching the league...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {results.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        onClick={() => setQuery('')}
                        className="flex items-center gap-5 p-4 rounded-2xl hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 transition-colors overflow-hidden shrink-0">
                          {result.image ? (
                            <img src={result.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            result.type === 'game' ? <Trophy size={24} className="opacity-20" /> : <User size={24} className="opacity-20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${result.type === 'player' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-400'}`}>
                              {result.type}
                            </span>
                          </div>
                          <p className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">{result.title}</p>
                          <p className="text-xs font-medium text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-[11px] uppercase font-black tracking-[0.4em] text-muted-foreground/30">No matches found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </div>

  <div className="max-w-[1400px] mx-auto px-4 py-4 pb-32 sm:pb-12 sm:pt-2">
        {featuredGame && (
            <div className="mb-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 rounded-[2rem] blur-lg opacity-30 group-hover:opacity-50 transition duration-500 animate-pulse"></div>
              <Link href={`/markets/${featuredGame.id}?sport=${featuredGame.sport_key}`} className="block">
                <div className="relative bg-gradient-to-br from-[#0A0C20] via-[#0D1030] to-[#0A0C20] border border-white/10 rounded-[1.75rem] overflow-hidden shadow-2xl">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                  
                  {/* Top Badge Bar */}
                  <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 text-primary text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em]">
                        Featured
                      </div>
                      {featuredGame.status === 'live' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[8px] sm:text-[9px] font-black text-red-400 uppercase tracking-widest">LIVE</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-zinc-300">
                        {formatLocalTime(featuredGame.game_time)}
                      </span>
                    </div>
                  </div>

                  {/* Main Matchup Content */}
                  <div className="relative p-5 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                      {/* Away Team */}
                      <div className="flex-1 flex flex-col items-center text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 flex items-center justify-center p-3 border border-white/10 shadow-lg group-hover:bg-white/10 transition-all mb-3">
                          <img 
                            src={getTeamLogoUrl(featuredGame.away_team, featuredGame.sport)} 
                            alt={featuredGame.away_team}
                            className="w-full h-full object-contain filter drop-shadow-lg"
                          />
                        </div>
                        <span className="text-base sm:text-xl font-black tracking-tight uppercase leading-tight text-white">{featuredGame.away_team}</span>
                        {featuredGame.status === 'live' && (
                          <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums mt-1">{featuredGame.away_score}</span>
                        )}
                      </div>

                      {/* VS */}
                      <div className="flex flex-col items-center gap-2 px-2">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 border border-white/10 flex items-center justify-center shadow-lg">
                          <span className="text-xs sm:text-sm font-black text-zinc-400">VS</span>
                        </div>
                      </div>

                      {/* Home Team */}
                      <div className="flex-1 flex flex-col items-center text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 flex items-center justify-center p-3 border border-white/10 shadow-lg group-hover:bg-white/10 transition-all mb-3">
                          <img 
                            src={getTeamLogoUrl(featuredGame.home_team, featuredGame.sport)} 
                            alt={featuredGame.home_team}
                            className="w-full h-full object-contain filter drop-shadow-lg"
                          />
                        </div>
                        <span className="text-base sm:text-xl font-black tracking-tight uppercase leading-tight text-white">{featuredGame.home_team}</span>
                        {featuredGame.status === 'live' && (
                          <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums mt-1">{featuredGame.home_score}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom CTA */}
                  <div className="relative border-t border-white/5 p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary/60" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-400">Super Bowl Challenge</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(61,225,0,0.3)] group-hover:shadow-[0_0_30px_rgba(61,225,0,0.4)] transition-all">
                      Trade Now
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-start pt-[20vh] gap-4">
            <Activity className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing games...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {displayGames.map((game) => (
                <div key={game.id}>
                  <Link
                    href={`/markets/${game.id}?sport=${game.sport_key}`}
                    className="block h-full"
                  >
                    <div className="bg-card border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-all hover:bg-accent/30 group h-full flex flex-col shadow-lg shadow-black/20">
                      <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded text-[10px] font-black bg-secondary text-secondary-foreground uppercase tracking-wider">
                              {game.sport}
                            </div>
                            {game.status === 'live' && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                                <span className="text-[10px] font-black text-destructive uppercase tracking-wider">
                                  LIVE
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                              <Clock className="w-4 h-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                {formatLocalTime(game.game_time)}
                              </span>
                            </div>
                          </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>

                        <div className="flex items-center justify-between flex-1">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center p-2 group-hover:bg-white/10 transition-colors">
                                  <img 
                                    src={getTeamLogoUrl(game.away_team, game.sport)} 
                                    alt={game.away_team}
                                    className="w-full h-full object-contain"
                                    onError={(e) => (e.target as HTMLImageElement).style.visibility = 'hidden'}
                                  />
                                </div>
                                <span className="text-lg font-bold tracking-tight">{game.away_team}</span>
                              </div>
                              {game.status === 'live' && (
                                <span className="text-2xl font-black text-white tabular-nums">
                                  {game.away_score}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center p-2 group-hover:bg-white/10 transition-colors">
                                  <img 
                                    src={getTeamLogoUrl(game.home_team, game.sport)} 
                                    alt={game.home_team}
                                    className="w-full h-full object-contain"
                                    onError={(e) => (e.target as HTMLImageElement).style.visibility = 'hidden'}
                                  />
                                </div>
                                <span className="text-lg font-bold tracking-tight">{game.home_team}</span>
                              </div>
                              {game.status === 'live' && (
                                <span className="text-2xl font-black text-white tabular-nums">
                                  {game.home_score}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                              <Trophy className="w-4 h-4 text-primary/50" />
                              <span>View Player Props</span>
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                              Trade Now
                            </div>
                          </div>

                    </div>
                  </Link>
                </div>
              ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 bg-card/50 backdrop-blur-xl border border-white/5 border-dashed rounded-3xl"
          >
            <Trophy className="w-16 h-16 text-muted mx-auto mb-6 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No games available</h3>
            <p className="text-muted-foreground">Check back later for upcoming matchups.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
