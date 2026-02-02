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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[#0A0C20]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-2">
                <div className="px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                  Featured Matchup
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Super Bowl Challenge</p>
                  <Link 
                    href="/community" 
                    className="text-primary hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    View Leaderboard <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              <Link href={`/markets/${featuredGame.id}?sport=${featuredGame.sport_key}`} className="block p-8 sm:p-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex-1 flex flex-col items-center md:items-start gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white/5 flex items-center justify-center p-6 border border-white/10 shadow-inner group-hover:bg-white/10 transition-all">
                        <img 
                          src={getTeamLogoUrl(featuredGame.away_team, featuredGame.sport)} 
                          alt={featuredGame.away_team}
                          className="w-full h-full object-contain filter drop-shadow-2xl"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">{featuredGame.away_team}</span>
                        {featuredGame.status === 'live' && (
                          <span className="text-4xl sm:text-6xl font-black text-primary tabular-nums mt-2">{featuredGame.away_score}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 px-8">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-xl font-black text-muted-foreground italic">VS</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/50 border border-white/5">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {formatLocalTime(featuredGame.game_time)}
                        </span>
                      </div>
                      {featuredGame.status === 'live' && (
                        <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/20 border border-destructive/30">
                          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          <span className="text-[10px] font-black text-destructive uppercase tracking-widest">LIVE NOW</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center md:items-end gap-6 text-right">
                    <div className="flex flex-col items-center md:items-end gap-6">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center md:items-end">
                          <span className="text-3xl sm:text-5xl font-black tracking-tighter uppercase">{featuredGame.home_team}</span>
                          {featuredGame.status === 'live' && (
                            <span className="text-4xl sm:text-6xl font-black text-primary tabular-nums mt-2">{featuredGame.home_score}</span>
                          )}
                        </div>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white/5 flex items-center justify-center p-6 border border-white/10 shadow-inner group-hover:bg-white/10 transition-all">
                          <img 
                            src={getTeamLogoUrl(featuredGame.home_team, featuredGame.sport)} 
                            alt={featuredGame.home_team}
                            className="w-full h-full object-contain filter drop-shadow-2xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <Trophy className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-tight">Trade Projections</h4>
                      <p className="text-sm text-muted-foreground font-medium">Over 50+ player props available for this matchup</p>
                    </div>
                  </div>
                  <div className="px-10 py-4 rounded-2xl bg-primary text-black text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_30px_rgba(var(--primary),0.3)] cursor-pointer">
                    Trade Now
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-start pt-[20vh] gap-4">
            <Activity className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing games...</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {displayGames.map((game) => (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
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
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
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
