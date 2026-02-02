'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Activity, User, ChevronRight, Loader2, CheckCircle2, Lock, TrendingUp, TrendingDown, LayoutGrid, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  total_volume?: number
  user_count?: number
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

const PROP_PRIORITY: Record<string, number> = {
  'player_points': 1,
  'player_rebounds': 2,
  'player_assists': 3,
  'player_pass_yds': 4,
  'player_rush_yds': 5,
  'player_reception_yds': 6,
  'player_steals': 7,
  'player_blocks': 8,
}

const STAT_GROUPS: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing',
  'player_rush_yds': 'Rushing',
  'player_reception_yds': 'Receiving',
  'player_rebounds': 'Rebounds',
  'player_assists': 'Assists',
  'player_steals': 'Defense',
  'player_blocks': 'Defense',
}

type SortOption = 'pct_change' | 'price' | 'volume'

function GameDetailsContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = params?.gameId as string
  const sportParam = searchParams.get('sport') || 'basketball_nba'
  const isNBA = sportParam.toLowerCase().includes('nba')

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<SortOption>('price')
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameStatus, setGameStatus] = useState<string>('upcoming')
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [gameId, sportParam])

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
        if (!gameRes.ok) throw new Error(`HTTP ${gameRes.status}`)
        const gameData = await gameRes.json()
        const game = gameData.games?.find((g: any) => g.id === gameId)
        if (game) {
          setGameStatus(game.status)
        }

        const response = await fetch(`/api/games/${gameId}/props?sport=${sportParam}${force ? `&t=${Date.now()}` : ''}`)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        const newProps = data.props || []
        setProps(newProps)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }

  const groupedByPlayer = useMemo(() => {
    let filteredProps = activeCategory === 'All' 
      ? props 
      : props.filter(p => STAT_GROUPS[p.prop_type] === activeCategory)
    
    // Remove defensive props for NBA
    if (isNBA) {
      filteredProps = filteredProps.filter(p => STAT_GROUPS[p.prop_type] !== 'Defense')
    }

    const playerMap: Record<string, { 
      player: PlayerProp, 
      props: PlayerProp[], 
      maxChange: number,
      totalVolume: number,
      maxPrice: number,
      availableMarkets: Set<string>
    }> = {}

    filteredProps.forEach(p => {
      if (!playerMap[p.player_name]) {
        playerMap[p.player_name] = { 
          player: p, 
          props: [], 
          maxChange: 0, 
          totalVolume: 0, 
          maxPrice: 0,
          availableMarkets: new Set()
        }
      }
      const val = p.current_value !== undefined ? p.current_value : p.line
      const diff = val - p.opening_line
      const pct = p.opening_line > 0 ? (diff / p.opening_line) * 100 : 0
      
      const marketName = PROP_NAMES[p.prop_type] || p.prop_type.replace(/player_/g, '').replace(/_/g, ' ')
      playerMap[p.player_name].availableMarkets.add(marketName)
      
      playerMap[p.player_name].props.push(p)
      playerMap[p.player_name].totalVolume += (p.total_volume || 0)
      
      if (val > playerMap[p.player_name].maxPrice) {
        playerMap[p.player_name].maxPrice = val
      }

      if (Math.abs(pct) > Math.abs(playerMap[p.player_name].maxChange)) {
        playerMap[p.player_name].maxChange = pct
      }
    })

    const result = Object.values(playerMap).map(item => ({
      ...item,
      props: item.props.sort((a, b) => (PROP_PRIORITY[a.prop_type] || 99) - (PROP_PRIORITY[b.prop_type] || 99))
    }))

    // Apply Sorting: Primary sort based on selection, then tie-breakers (Price -> Pct Change -> Volume)
    return result.sort((a, b) => {
      if (sortBy === 'price') {
        return (b.maxPrice - a.maxPrice) || (Math.abs(b.maxChange) - Math.abs(a.maxChange)) || (b.totalVolume - a.totalVolume)
      }
      if (sortBy === 'pct_change') {
        return (Math.abs(b.maxChange) - Math.abs(a.maxChange)) || (b.maxPrice - a.maxPrice) || (b.totalVolume - a.totalVolume)
      }
      if (sortBy === 'volume') {
        return (b.totalVolume - a.totalVolume) || (Math.abs(b.maxChange) - Math.abs(a.maxChange)) || (b.maxPrice - a.maxPrice)
      }
      return 0
    })
  }, [props, activeCategory, sortBy, isNBA])

  const categories = useMemo(() => {
    let cats = Array.from(new Set(props.map(p => STAT_GROUPS[p.prop_type] || 'Other')))
    
    // Remove Defense from categories if NBA
    if (isNBA) {
      cats = cats.filter(c => c !== 'Defense')
    }

    const preferredOrder = ['Points', 'Rebounds', 'Assists', 'Passing', 'Rushing', 'Receiving']
    return ['All', ...cats.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a)
      const idxB = preferredOrder.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })]
  }, [props, isNBA])

  async function handlePropClick(prop: PlayerProp) {
    setNavigatingId(prop.id)
    router.push(`/markets/${gameId}/${prop.id}?sport=${sportParam}&name=${encodeURIComponent(prop.player_name)}`)
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
        {/* Navigation & Filters */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/markets"
              className="px-4 py-2.5 rounded-xl bg-card/40 text-muted-foreground border-2 border-border/50 hover:border-primary/50 hover:text-white transition-all flex items-center gap-2 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Back</span>
            </Link>
            
            <div className="flex items-center gap-2 bg-card/40 p-1 rounded-xl border-2 border-border/50">
              {(['price', 'pct_change', 'volume'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all",
                    sortBy === option 
                      ? "bg-primary text-black" 
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  {option.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            {categories.map((cat) => (
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
        </div>

            {loading ? (
              <div className="pt-[20vh] pb-12 flex flex-col items-center justify-start gap-4">
                <Activity className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing player data...</p>
              </div>
            ) : (
            <div className="space-y-4">
            {groupedByPlayer.map(({ player, props: playerProps, maxChange, totalVolume, availableMarkets }) => {
              const isUp = maxChange >= 0
              const marketsArray = Array.from(availableMarkets)

              return (
                <div key={player.player_name} className="space-y-2">
                  <div
                    className={cn(
                      "w-full bg-[#0d0e1f] border-2 border-border/40 rounded-[2rem] p-5 flex items-center justify-between relative overflow-hidden group"
                    )}
                  >
                    {/* Background Accent */}
                    <div className={cn(
                      "absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
                      isUp ? "bg-emerald-500" : "bg-red-500"
                    )} />

                    <div className="flex items-center gap-4 relative z-10 w-full">
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

                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-none tracking-tight truncate">
                            {player.player_name}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {marketsArray.slice(0, 3).map(market => (
                            <span key={market} className="px-2 py-0.5 bg-card border border-border/50 rounded-md text-[9px] font-black uppercase text-muted-foreground tracking-tighter">
                              {market}
                            </span>
                          ))}
                          {marketsArray.length > 3 && (
                            <span className="text-[9px] font-black text-muted-foreground/50">+{marketsArray.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "grid gap-3 px-4 pb-4",
                      playerProps.length === 1 ? "grid-cols-1" : playerProps.length === 2 ? "grid-cols-2" : "grid-cols-3"
                    )}
                  >
                    {playerProps.map((prop) => {
                      const val = prop.current_value !== undefined ? prop.current_value : prop.line

                        return (
                          <button
                            key={prop.id}
                            onClick={() => handlePropClick(prop)}
                            className="w-full bg-[#16172d]/80 border-2 border-border/40 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-primary/40 hover:bg-[#1a1b3a] transition-all group relative overflow-hidden"
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] opacity-80 group-hover:opacity-100 transition-opacity">
                                {PROP_NAMES[prop.prop_type] || prop.prop_type.replace(/player_/g, '').replace(/_/g, ' ')}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-black text-white tracking-tighter leading-none">
                                {val}
                              </span>
                            </div>

                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ChevronRight className="w-3 h-3 text-primary" />
                            </div>
                          </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {groupedByPlayer.length === 0 && (
              <div className="py-24 text-center bg-card/20 rounded-[2rem] border-2 border-dashed border-border/50">
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

