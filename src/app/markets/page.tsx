'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Clock, ChevronRight, Activity, HelpCircle, Zap, Settings, Bell, TrendingUp, TrendingDown, Flame, IceRelief } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { useOnboarding } from '@/components/OnboardingProvider'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'

interface Mover {
  id: string
  player_name: string
  team: string
  sport: string
  photo_url: string
  prop_type: string
  current_value: number
  changePercent: number
  game_id: string
  sport_key: string
}

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
  const [movers, setMovers] = useState<{ risers: Mover[], fallers: Mover[] }>({ risers: [], fallers: [] })
  const [loading, setLoading] = useState(true)
  const [loadingMovers, setLoadingMovers] = useState(true)
  const [sportsSettings, setSportsSettings] = useState<SportsSettings>({ NBA: true, NFL: true })
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const { showRules } = useOnboarding()

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID
  const isAdmin = user && adminId?.split(',').map(id => id.trim().toLowerCase()).includes(user.id.toLowerCase())

    const getTimeAgo = (dateStr?: string) => {
      if (!dateStr) return null;
      const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      return `${Math.floor(minutes / 60)}h ago`;
    };

    const fetchUnreadCount = async () => {
      if (!user) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return

        const response = await fetch('/api/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.notifications) {
          setUnreadNotifications(data.notifications.filter((n: any) => !n.is_read).length)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    useEffect(() => {
      fetchGames()
      fetchMovers()
      fetchSettings()
      fetchUnreadCount()
      const interval = setInterval(() => {
        fetchGames()
        fetchMovers()
        fetchUnreadCount()
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

    async function fetchMovers() {
      try {
        const response = await fetch('/api/props/movers')
        const data = await response.json()
        if (data.risers || data.fallers) {
          setMovers({
            risers: data.risers || [],
            fallers: data.fallers || []
          })
        }
      } catch (error) {
        console.error('Error fetching movers:', error)
      } finally {
        setLoadingMovers(false)
      }
    }

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
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
              <div className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-white uppercase leading-tight text-center sm:text-left">
                          Trade <span className="text-primary italic">Player Stats</span>
                      </h1>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">

                      <Button 
                        onClick={showRules}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold gap-2 group whitespace-nowrap"
                      >
                        <HelpCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        HOW TO PLAY
                      </Button>
                      
                      <Link href="/notifications">
                        <Button 
                          variant="outline"
                          className="h-12 px-5 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold gap-2 group relative"
                        >
                          <Bell className={`w-5 h-5 transition-transform group-hover:scale-110 ${unreadNotifications > 0 ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
                          {unreadNotifications > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-black ring-4 ring-background animate-in zoom-in">
                              {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                          )}
                        </Button>
                      </Link>

                      {isAdmin && (
                        <Link href="/test-live">
                          <Button 
                            variant="outline"
                            className="h-12 px-6 rounded-2xl bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-500 font-bold gap-2 group whitespace-nowrap"
                          >
                            <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            LIVE SIMULATOR
                          </Button>
                        </Link>
                      )}
                      </div>
                    </div>

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

          {/* Movers Section */}
          {!loadingMovers && (movers.risers.length > 0 || movers.fallers.length > 0) && (
            <div className="mb-10 space-y-10">
              {movers.risers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/20">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight italic">Top Risers</h2>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Market 24h</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {movers.risers.map((mover) => (
                      <Link 
                        key={mover.id} 
                        href={`/markets/${mover.game_id}/${mover.id}?sport=${mover.sport_key}`}
                        className="group relative bg-card border border-border rounded-[2rem] p-4 hover:border-orange-500/50 transition-all hover:bg-orange-500/5 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                        
                        <div className="flex flex-col items-center text-center gap-3 relative z-10">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500/20 bg-orange-500/5 p-0.5">
                              <img 
                                src={mover.photo_url || getTeamLogoUrl(mover.team, mover.sport)} 
                                alt={mover.player_name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-1">{mover.player_name.split(' ').pop()}</p>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{mover.prop_type.split('_').pop()}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-sm font-black text-emerald-400">+{mover.changePercent.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/40">{mover.current_value.toFixed(1)}</span>
                            <div className="flex gap-0.5">
                              <div className="w-1 h-3 bg-emerald-400/20 rounded-full" />
                              <div className="w-1 h-4 bg-emerald-400/40 rounded-full" />
                              <div className="w-1 h-5 bg-emerald-400 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {movers.fallers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                        <TrendingDown className="w-5 h-5 text-blue-500" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-tight italic">Top Fallers</h2>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Market 24h</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {movers.fallers.map((mover) => (
                      <Link 
                        key={mover.id} 
                        href={`/markets/${mover.game_id}/${mover.id}?sport=${mover.sport_key}`}
                        className="group relative bg-card border border-border rounded-[2rem] p-4 hover:border-blue-500/50 transition-all hover:bg-blue-500/5 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                        
                        <div className="flex flex-col items-center text-center gap-3 relative z-10">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/20 bg-blue-500/5 p-0.5">
                              <img 
                                src={mover.photo_url || getTeamLogoUrl(mover.team, mover.sport)} 
                                alt={mover.player_name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center">
                              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-1">{mover.player_name.split(' ').pop()}</p>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">{mover.prop_type.split('_').pop()}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-sm font-black text-red-400">{mover.changePercent.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/40">{mover.current_value.toFixed(1)}</span>
                            <div className="flex gap-0.5">
                              <div className="w-1 h-5 bg-red-400 rounded-full" />
                              <div className="w-1 h-4 bg-red-400/40 rounded-full" />
                              <div className="w-1 h-3 bg-red-400/20 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Active Markets</h2>
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
                            {formatLocalTime(game.game_time)}
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
                            <Zap className="w-4 h-4 text-primary/50" />
                            <span>Trade Now</span>
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
