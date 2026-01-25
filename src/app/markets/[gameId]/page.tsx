'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Activity, User, ChevronRight, Loader2, CheckCircle2, Lock, TrendingUp, TrendingDown, LayoutGrid } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { isMarketLocked, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PlayerProp {
  id: string
  player_name: string
  team?: string
  sport?: string
  photo_url?: string
  line: number
  opening_line: number
  current_value?: number
  prop_type: string
  last_update?: string
  status?: string
}

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing',
  'player_rush_yds': 'Rushing',
  'player_reception_yds': 'Receiving',
  'player_rebounds': 'Rebounds',
  'player_assists': 'Assists',
  'player_steals': 'Steals',
  'player_blocks': 'Blocks',
}

const STAT_GROUPS: Record<string, string> = {
  'player_points': 'Scoring',
  'player_pass_yds': 'Passing',
  'player_rush_yds': 'Rushing',
  'player_reception_yds': 'Receiving',
  'player_rebounds': 'Rebounds',
  'player_assists': 'Playmaking',
  'player_steals': 'Defense',
  'player_blocks': 'Defense',
}

function GameDetailsContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = params?.gameId as string
  const sport = searchParams.get('sport') || 'basketball_nba'

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameStatus, setGameStatus] = useState<string>('upcoming')
  const [navigatingId, setNavigatingId] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [gameId, sport])

    const [loadingMessage, setLoadingMessage] = useState('Updating indices...')

    useEffect(() => {
      if (!loading) return
      const messages = ['Updating indices...', 'Syncing market data...', 'Analyzing player performance...', 'Connecting to feeds...', 'Initializing terminal...']
      let i = 0
      const interval = setInterval(() => {
        i = (i + 1) % messages.length
        setLoadingMessage(messages[i])
      }, 800)
      return () => clearInterval(interval)
    }, [loading])

    async function fetchData(force: boolean = false) {
    try {
      const gameRes = await fetch('/api/games' + (force ? `?t=${Date.now()}` : ''))
      const gameData = await gameRes.json()
      const game = gameData.games?.find((g: any) => g.id === gameId)
      if (game) {
        setGameStatus(game.status)
      }

      const response = await fetch(`/api/games/${gameId}/props?sport=${sport}${force ? `&t=${Date.now()}` : ''}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      
      // Enforce consistent sort order by player name then prop type to prevent shuffling
      const sortedProps = (data.props || []).sort((a: PlayerProp, b: PlayerProp) => {
        if (a.player_name < b.player_name) return -1;
        if (a.player_name > b.player_name) return 1;
        return a.prop_type.localeCompare(b.prop_type);
      });
      
      setProps(sortedProps)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const groupedProps = useMemo(() => {
    const categories = Array.from(new Set(props.map(p => STAT_GROUPS[p.prop_type] || 'Other')))
    const grouped: Record<string, PlayerProp[]> = {}
    
    props.forEach(p => {
      const cat = STAT_GROUPS[p.prop_type] || 'Other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(p)
    })

    return { categories: ['All', ...categories], grouped }
  }, [props])

  const displayedProps = useMemo(() => {
    if (activeCategory === 'All') return props
    return groupedProps.grouped[activeCategory] || []
  }, [props, activeCategory, groupedProps])

  async function handlePlayerClick(player: PlayerProp) {
    setNavigatingId(player.id)
    router.push(`/markets/${gameId}/${player.id}?sport=${sport}&name=${encodeURIComponent(player.player_name)}`)
  }

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
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        {/* Category Selector - Stock Market Style */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          <Link
            href="/markets"
            className="px-4 py-2.5 rounded-xl bg-card/40 text-muted-foreground border-2 border-border/50 hover:border-primary/50 hover:text-white transition-all flex items-center gap-2 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Back</span>
          </Link>
          {groupedProps.categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2",
                activeCategory === cat 
                  ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105" 
                  : "bg-card/40 text-muted-foreground border-border/50 hover:border-primary/50 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

          {loading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
              <div className="relative">
                {/* Outer pulsing ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-[-40px] bg-primary/20 rounded-full blur-3xl"
                />
                
                {/* Hexagon/Circle spinner */}
                <div className="relative w-24 h-24">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 border-2 border-primary/20 rounded-full"
                      animate={{
                        rotate: 360,
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "linear",
                      }}
                      style={{ borderTopColor: 'var(--primary)' }}
                    />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-primary" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <motion.span 
                    key={loadingMessage}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-black uppercase tracking-[0.4em] text-primary"
                  >
                    {loadingMessage}
                  </motion.span>
                  <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                    Terminal Status: Active
                  </span>
                </div>
                
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        backgroundColor: ['rgba(var(--primary), 0.2)', 'rgba(var(--primary), 1)', 'rgba(var(--primary), 0.2)'],
                        scaleY: [1, 1.5, 1]
                      }}
                      transition={{ 
                        duration: 1, 
                        repeat: Infinity, 
                        delay: i * 0.15 
                      }}
                      className="w-1.5 h-4 bg-primary rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedProps.map((player) => {
              const val = player.current_value !== undefined ? player.current_value : player.line
              const diff = val - player.opening_line
              const pct = player.opening_line > 0 ? (diff / player.opening_line) * 100 : 0
              const isUp = diff >= 0

              return (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player)}
                  disabled={navigatingId !== null}
                  className="group text-left w-full relative"
                >
                  <div className={cn(
                    "bg-[#0d0e1f] border-2 border-border/40 rounded-[2rem] p-5 flex items-center justify-between hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 overflow-hidden relative",
                    navigatingId === player.id && "opacity-50"
                  )}>
                    {/* Background Accent */}
                    <div className={cn(
                      "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
                      isUp ? "bg-emerald-500" : "bg-red-500"
                    )} />

                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-border/50 bg-card flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
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
                            className="w-10 h-10 object-contain opacity-40 group-hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground/40" />
                        )}
                      </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                              {PROP_NAMES[player.prop_type] || player.prop_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                            <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors leading-none tracking-tight">
                              {player.player_name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[10px] font-bold font-mono",
                                isUp ? "text-emerald-400" : "text-red-400"
                              )}>
                                {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                              </span>
                              <Link 
                                href={`/players/${player.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] font-black text-muted-foreground/60 hover:text-white uppercase tracking-widest border-b border-white/10 hover:border-white transition-colors"
                              >
                                View History
                              </Link>
                            </div>
                          </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 relative z-10">
                      <div className="flex items-center gap-2">
                        {isMarketLocked(player.status) ? (
                          <Lock className="w-4 h-4 text-red-500/50" />
                        ) : (
                          <div className="flex items-center gap-1">
                            {isUp ? (
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                        )}
                        <span className="text-2xl font-black text-white tracking-tighter">
                          {val}
                        </span>
                      </div>
                    </div>
                    
                    {navigatingId === player.id && (
                      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}

            {displayedProps.length === 0 && (
              <div className="col-span-full py-24 text-center bg-card/20 rounded-[2rem] border-2 border-dashed border-border/50">
                <LayoutGrid className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">No Markets Available</h3>
                <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">Select another category or refresh</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}

export default function GameDetailsPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <GameDetailsContent />
    </React.Suspense>
  )
}

