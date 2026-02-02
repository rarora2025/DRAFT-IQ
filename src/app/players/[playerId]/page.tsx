'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Trophy, 
  User as UserIcon,
  ChevronRight,
  BarChart3,
  Info,
  Zap,
  Target,
  X,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { TradingChart } from '@/components/TradingChart'
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PlayerData {
  player: {
    id: string
    name: string
    team: string | null
    sport: string
    photo_url: string | null
  }
  props: any[]
  history: any[]
}

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="text-muted-foreground/50 hover:text-white transition-colors">
          <Info size={10} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

function PerformanceBarChart({ data, propType }: { data: any[], propType: string }) {
  if (!data?.length) return null

  // Sort by date ascending for chart
  const chartData = [...data]
    .filter(p => p.prop_type === propType || !propType)
    .sort((a, b) => new Date(a.games?.game_time).getTime() - new Date(b.games?.game_time).getTime())
    .slice(-10) // Last 10 games
    .map(p => ({
      name: new Date(p.games?.game_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: p.current_value || p.line,
      line: p.line,
      opponent: p.games?.away_team === p.player_name ? p.games?.home_team : p.games?.away_team
    }))

  if (chartData.length === 0) return null

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
          />
          <RechartsTooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-[#020420] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{data.name}</p>
                    <p className="text-sm font-black text-white">Result: {data.value}</p>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">vs {data.opponent}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            fill="url(#barGradient)"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.value >= entry.line ? '#3de100' : '#ff4d4d'} 
                fillOpacity={0.8}
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.8} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.3} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PlayerProfileContent() {
  const params = useParams()
  const router = useRouter()
  const playerId = params?.playerId as string
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'performances'>('performances')
  const chartRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewMode === 'graph' && chartRef.current) {
      chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [viewMode, selectedPropId])

  useEffect(() => {
    if (!playerId || playerId === '[playerId]') return

    let isMounted = true

    async function fetchPlayerData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/players/${playerId}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API Error (${response.status}): ${errorText}`)
        }

        const json = await response.json()
        
        if (isMounted) {
          setData(json)
          if (json.props?.length > 0) {
            setSelectedPropId(json.props[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching player data:', error)
        // If it's a TypeError, it might be a network issue or the server is down
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.warn('Network error or server unreachable. Retrying might help.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPlayerData()

    return () => {
      isMounted = false
    }
  }, [playerId])

  const selectedProp = useMemo(() => {
    return data?.props.find(p => p.id === selectedPropId) || data?.props[0]
  }, [data, selectedPropId])

  const liveMarkets = useMemo(() => {
    if (!data?.props) return []
    return data.props.filter(p => p.games?.status === 'live')
  }, [data])

  const propHistory = useMemo(() => {
    if (!selectedProp || !data?.history) return []
    return data.history
      .filter(h => h.prop_id === selectedProp.id)
      .map(h => ({
        time: h.timestamp,
        value: h.price
      }))
  }, [selectedProp, data])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing player profile...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020420] text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 relative">
          <UserIcon className="w-10 h-10 text-muted-foreground/30" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Market Not Found</h1>
          <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
            The player or market you're looking for is currently offline or unavailable.
          </p>
        </div>
        <Button 
          onClick={() => router.push('/markets')} 
          className="bg-primary text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          Return to Markets
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020420] pb-32 text-white selection:bg-primary/30">
      {/* Decorative Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-8 relative z-10">
        {/* Top Nav */}
        <div className="mb-8 flex items-center justify-between invisible h-0">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-3 text-muted-foreground hover:text-white transition-all"
          >
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
              <ArrowLeft size={18} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Back</span>
          </button>
          <div className="px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-2">
            <Activity size={14} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live Profile</span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Player Bio Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-white/5 relative z-10">
                  {data.player.photo_url ? (
                    <img src={data.player.photo_url} alt={data.player.name} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon size={48} className="text-white/10" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
                <div className="text-center md:text-left space-y-2">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">{data.player.name}</h1>
                      <div className="flex items-center justify-center md:justify-start gap-3">
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{data.player.sport}</span>
                        {data.player.team && data.player.team.trim() && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-sm font-bold text-zinc-400">{data.player.team}</span>
                          </>
                        )}
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{data.props.length} Markets Tracked</span>
                      </div>
                </div>

                  <div className="flex flex-col gap-3 items-center md:items-end">
                    {liveMarkets.map((prop) => (
                      <Link 
                        key={prop.id}
                        href={`/markets/${prop.games.id}/${prop.id}?sport=${prop.games.sport || 'basketball_nba'}&name=${encodeURIComponent(data.player.name)}`}
                        className="group/live flex items-center gap-4 p-4 rounded-3xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all w-full md:w-fit max-w-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                            <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Live Market</span>
                          </div>
                          <p className="text-xs font-bold text-white uppercase tracking-tight">
                            {PROP_NAMES[prop.prop_type] || prop.prop_type.replace(/_/g, ' ')} • {prop.games.away_team} @ {prop.games.home_team}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center group-hover/live:translate-x-1 transition-transform">
                          <ChevronRight size={16} className="text-destructive" />
                        </div>
                      </Link>
                    ))}
                  </div>

              </div>
            </div>
          </motion.div>

          {/* Performance History Section */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(61,225,0,0.5)]" />
                    <div className="flex flex-col">
                      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Performance History</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                        Past {Math.min(data.props.length, 10)} Games • {PROP_NAMES[selectedProp?.prop_type] || selectedProp?.prop_type || 'All Stats'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 pb-2">
                  <PerformanceBarChart data={data.props} propType={selectedProp?.prop_type} />
                </div>

                <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Event</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Result</th>
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.props.map((prop) => {
                          const opponent = prop.games?.home_team === data.player.team ? prop.games?.away_team : prop.games?.home_team;
                          const value = prop.current_value || prop.line;
                          const isSelected = selectedPropId === prop.id && viewMode === 'graph';
                          
                          return (
                            <tr key={prop.id} className={`group hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                              <td className="px-6 py-4">
                                <span className="text-xs font-mono font-bold text-zinc-400">
                                  {new Date(prop.games?.game_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-white uppercase tracking-tight">vs {opponent}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                  {PROP_NAMES[prop.prop_type] || prop.prop_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-black text-white font-mono">{value}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedPropId(prop.id);
                                    setViewMode('graph');
                                  }}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isSelected 
                                    ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  {isSelected ? <BarChart3 size={12} /> : <TrendingUp size={12} />}
                                  {isSelected ? 'Viewing' : 'View'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                  {viewMode === 'graph' && selectedProp && (
                    <motion.div
                      ref={chartRef}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative group scroll-mt-8"
                    >

                    <div className="absolute top-4 right-4 z-20">
                      <button 
                        onClick={() => setViewMode('performances')}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                      <TradingChart 
                        currentValue={selectedProp.current_value || selectedProp.line}
                        history={propHistory}
                        line={selectedProp.line}
                        propType={PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
                        lastUpdated={selectedProp.updated_at || (selectedProp as any).last_update}
                        isLive={selectedProp.games?.status === 'live'}
                        gameStatus={selectedProp.games?.status}
                        status={selectedProp.status}
                      />
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>


        <Navbar />
      </div>
    </div>
  )
}

export default function PlayerProfilePage() {
  return (
    <TooltipProvider>
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
          <Activity className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing player profile...</p>
        </div>
      }>
        <PlayerProfileContent />
      </React.Suspense>
    </TooltipProvider>
  )
}

