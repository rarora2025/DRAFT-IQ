'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Activity, User, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getTeamLogoUrl } from '@/lib/team-utils'

interface PlayerProp {
  id: string
  player_name: string
  team?: string
  sport?: string
  photo_url?: string
  line: number
  prop_type: string
  last_update?: string
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
  const gameId = params?.gameId as string
  const sport = searchParams.get('sport') || 'basketball_nba'

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds as requested
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [gameId, sport])

  async function triggerSync() {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await fetch(`/api/sync?gameId=${gameId}`)
      await fetchData()
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  async function fetchData() {
    try {
      console.log('Fetching props for game:', gameId, 'sport:', sport);
      const response = await fetch(`/api/games/${gameId}/props?sport=${sport}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json()
      console.log('Received props:', data.props?.length);
      setProps(data.props || [])

      // Auto-trigger sync if no props or very stale (e.g. > 2 mins)
      const mostRecentUpdate = data.props?.[0]?.last_update
      const isStale = mostRecentUpdate && (new Date().getTime() - new Date(mostRecentUpdate).getTime() > 2 * 60 * 1000)
      
      if ((!data.props || data.props.length === 0 || isStale) && !isSyncing) {
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

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Games
        </Link>

          <div className="mb-10 flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 font-display">
                Open <span className="text-primary italic">Markets</span>
              </h1>
              <p className="text-muted-foreground">Trade on individual player performance</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-2 text-primary text-sm font-medium animate-pulse mb-1">
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Syncing live lines...</span>
                </div>
              ) : (
                <button
                  onClick={() => triggerSync()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all text-xs font-bold border border-primary/20"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Refresh Lines
                </button>
              )}
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
              <Link
                key={player.id}
                href={`/markets/${gameId}/${player.id}?sport=${sport}&name=${encodeURIComponent(player.player_name)}`}
                className="group"
              >
                    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-primary/50 hover:bg-accent/30 transition-all">
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
                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                          {PROP_NAMES[player.prop_type] || player.prop_type.replace(/_/g, ' ')}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-base font-black text-primary">
                          {player.line}
                        </span>
                        {player.last_update && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-border" />
                            <span className="text-[10px] text-muted-foreground">
                              Updated {new Date(player.last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                </div>
              </Link>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl">
                <Search className="w-12 h-12 text-muted mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? `No props found matching "${searchQuery}"` : "Props are locked right now"}
                </p>
                <button 
                  onClick={() => fetchData()}
                  className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-bold border border-primary/20"
                >
                  Retry Sync
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
