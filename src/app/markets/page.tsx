'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Trophy, Clock, ChevronRight, Activity, Settings, Search, X, User } from 'lucide-react'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { useOnboarding } from '@/components/OnboardingProvider'
import { useSearch } from '@/components/SearchProvider'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Switch } from '@/components/ui/switch'
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
  const isAdmin = user && process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').includes(user.id)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [sportsSettings, setSportsSettings] = useState<SportsSettings>({ NBA: true, NFL: true })
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const { query, setQuery, results, isSearching } = useSearch()

  useEffect(() => {
      fetchGames()
      fetchSettings()
      const interval = setInterval(() => {
        fetchGames()
      }, 15000)
      return () => clearInterval(interval)
    }, [user])

    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/settings')
        const data = await response.json()
        setSportsSettings(data.settings)
      } catch (error) {
        console.error('Error fetching settings:', error)
      }
    }

    async function toggleSport(sport: 'NBA' | 'NFL', enabled: boolean) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ sport, enabled })
        })
        const data = await response.json()
        if (data.success) {
          setSportsSettings(data.settings)
          fetchGames()
        }
      } catch (error) {
        console.error('Error toggling sport:', error)
      }
    }

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
      let result = [...games]
      
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
  <div className="sticky top-0 z-[100] w-full bg-background/60 backdrop-blur-xl border-b border-white/[0.05] py-3 sm:py-4 mb-4 sm:mb-6">
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 flex items-center gap-4 sm:gap-8">
      <Link href="/markets" className="shrink-0 block">
        <img 
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/DraftIQ-Logo-1770001050250.png?width=8000&height=8000&resize=contain" 
          alt="DraftIQ" 
          className="h-6 sm:h-8 w-auto object-contain"
        />
      </Link>
      <div className="relative group w-full flex-1">
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
          
          {isAdmin && (
            <div className="mb-6">
              <Button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                variant="outline"
                className="w-full h-12 rounded-2xl bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-500 font-bold gap-2"
              >
                <Settings className="w-5 h-5" />
                ADMIN CONTROLS
              </Button>
              
              {showAdminPanel && (
                <div className="mt-4 p-4 bg-card border border-border rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Toggle Sports Visibility</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">NBA</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${sportsSettings.NBA ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {sportsSettings.NBA ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <Switch
                        checked={sportsSettings.NBA}
                        onCheckedChange={(checked) => toggleSport('NBA', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">NFL</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${sportsSettings.NFL ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {sportsSettings.NFL ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <Switch
                        checked={sportsSettings.NFL}
                        onCheckedChange={(checked) => toggleSport('NFL', checked)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Changes apply to all users immediately.</p>
                </div>
              )}
            </div>
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
              {filteredGames.map((game) => (
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
