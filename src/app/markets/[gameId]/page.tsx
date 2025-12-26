'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Activity, User, Search, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { toast } from 'sonner'

interface PlayerProp {
  id: string
  player_name: string
  team?: string
  sport?: string
  photo_url?: string
  line: number
  prop_type: string
  last_update?: string
  status?: string
}

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

export default function GameDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = params?.gameId as string
  const sport = searchParams.get('sport') || 'basketball_nba'

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameStatus, setGameStatus] = useState<string>('upcoming')
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  useEffect(() => {
    fetchData()
    // Refresh every 10 seconds for live feel
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [gameId, sport])

  async function triggerSync() {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const res = await fetch(`/api/sync?gameId=${gameId}&force=true`)
      if (!res.ok) throw new Error('Sync failed')
      await fetchData(true)
      setLastSynced(new Date())
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handlePlayerClick(player: PlayerProp) {
    setNavigatingId(player.id)
    
    // Fast sync check before navigating to ensure fresh lines
    // We don't await it fully if it's too slow to avoid "lag"
    const syncPromise = fetch(`/api/sync?gameId=${gameId}`)
    
    // Wait max 800ms for sync
    await Promise.race([
      syncPromise,
      new Promise(resolve => setTimeout(resolve, 800))
    ]).catch(console.error)

    router.push(`/markets/${gameId}/${player.id}?sport=${sport}&name=${encodeURIComponent(player.player_name)}`)
  }

  async function fetchData(force: boolean = false) {
    try {
      // Fetch game status first
      const gameRes = await fetch('/api/games' + (force ? `?t=${Date.now()}` : ''))
      const gameData = await gameRes.json()
      const game = gameData.games?.find((g: any) => g.id === gameId)
      if (game) {
        setGameStatus(game.status)
      }

      const response = await fetch(`/api/games/${gameId}/props?sport=${sport}${force ? `&t=${Date.now()}` : ''}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      setProps(data.props || [])

      // Auto-trigger sync if no props or stale
      const mostRecentUpdate = data.props?.[0]?.last_update
      const isStale = mostRecentUpdate && (new Date().getTime() - new Date(mostRecentUpdate).getTime() > 2 * 60 * 1000)
      
      if ((!data.props || data.props.length === 0 || isStale) && !isSyncing && game?.status !== 'completed') {
        triggerSync()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return props
    const search = searchQuery.toLowerCase()
    return props.filter(p => p.player_name.toLowerCase().includes(search))
  }, [props, searchQuery])

  if (gameStatus === 'completed') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center border-4 border-muted/20">
          <Activity className="w-16 h-16 text-muted-foreground opacity-50" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Game Completed</h1>
          <p className="text-muted-foreground max-w-xs mx-auto text-lg italic">All markets for this game are officially closed.</p>
        </div>
        <Link href="/markets" className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all">
          View Other Markets
        </Link>
        <Navbar isDark={true} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Games
          </Link>

                  <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            {lastSynced && (
                              <span className="text-[10px] font-mono font-bold text-primary/60 uppercase tracking-tight flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Updated {lastSynced.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        <button
                          onClick={() => triggerSync()}
                          disabled={isSyncing}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl hover:bg-primary/90 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Activity className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Syncing...' : 'Refresh'}
                        </button>
                      </div>
                  </div>

        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading props...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handlePlayerClick(player)}
                disabled={navigatingId !== null}
                className="group text-left w-full"
              >
                    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-primary/50 hover:bg-accent/30 transition-all relative overflow-hidden">
                      {navigatingId === player.id && (
                        <div className="absolute inset-0 bg-primary/5 flex items-center justify-end pr-12">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-primary/20 bg-primary/10 flex items-center justify-center shrink-0">
                          {player.photo_url ? (
                            <img 
                              src={player.photo_url} 
                              alt={player.player_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = player.team ? getTeamLogoUrl(player.team, player.sport || 'nba') : '';
                              }}
                            />
                          ) : player.team ? (
                            <img 
                              src={getTeamLogoUrl(player.team, player.sport || 'nba')} 
                              alt={player.team}
                              className="w-10 h-10 object-contain opacity-80"
                            />
                          ) : (
                            <User className="w-8 h-8 text-primary/40" />
                          )}
                        </div>
                          <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {player.player_name}
                        </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                {PROP_NAMES[player.prop_type] || player.prop_type.replace(/_/g, ' ')}
                              </span>
                              <div className="w-1 h-1 rounded-full bg-border" />
                              <span className={`text-base font-black ${player.status === 'LOCKED' ? 'text-destructive' : 'text-primary'}`}>
                                {player.status === 'LOCKED' ? 'LOCKED' : player.line}
                              </span>
                            </div>

                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              </button>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
                <div className="text-center py-24 px-8 bg-[#0a0b1e]/60 border border-white/5 backdrop-blur-xl rounded-[2.5rem] relative z-10">
                  <div className="mb-6 relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="w-20 h-20 bg-card border border-white/10 rounded-3xl flex items-center justify-center relative z-10 mx-auto transform group-hover:scale-110 transition-transform duration-500">
                      <Activity className="w-10 h-10 text-primary opacity-50" />
                      <div className="absolute -top-1 -right-1">
                        <div className="relative">
                          <div className="absolute inset-0 bg-red-500 animate-ping rounded-full opacity-40" />
                          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0b1e] relative z-10" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
                    {searchQuery ? 'No Players Found' : 'Markets Locked'}
                  </h3>
                  <p className="text-muted-foreground max-w-[280px] mx-auto text-sm leading-relaxed mb-8">
                    {searchQuery 
                      ? `We couldn't find any players matching "${searchQuery}". Try a different name.`
                      : "The trading window for this contest is currently closed. Check back soon for live updates."}
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    <button 
                      onClick={() => fetchData()}
                      className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs"
                    >
                      Retry Sync
                    </button>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-muted-foreground hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
