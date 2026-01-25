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
  X
} from 'lucide-react'
import Link from 'next/link'
import { TradingChart } from '@/components/TradingChart'
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

function PlayerProfileContent() {
  const params = useParams()
  const router = useRouter()
  const playerId = params?.playerId as string
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'performances'>('performances')

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

  const propHistory = useMemo(() => {
    if (!selectedProp || !data?.history) return []
    return data.history
      .filter(h => h.prop_id === selectedProp.id)
      .map(h => ({
        time: h.timestamp,
        value: h.price
      }))
  }, [selectedProp, data])

  const stats = useMemo(() => {
    if (!data?.props) return null
    const propTypes = [...new Set(data.props.map(p => p.prop_type))]
    return propTypes.map(type => {
      const typeProps = data.props.filter(p => p.prop_type === type)
      const avg = typeProps.reduce((acc, p) => acc + (p.current_value || p.line), 0) / typeProps.length
      return {
        type,
        name: PROP_NAMES[type] || type,
        avg: avg.toFixed(1),
        count: typeProps.length
      }
    })
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020420] text-white flex flex-col items-center justify-center p-4">
        <UserIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tighter">Player Not Found</h1>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Player Bio & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-8"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-2 border-white/10 bg-white/5 relative z-10">
                    {data.player.photo_url ? (
                      <img src={data.player.photo_url} alt={data.player.name} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon size={48} className="text-white/10" />
                      </div>
                    )}
                  </div>
                </div>
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white mb-1">{data.player.name}</h1>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-xs font-black text-primary uppercase tracking-widest">{data.player.sport}</span>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{data.props.length} Markets Tracked</span>
                    </div>
                  </div>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stats?.slice(0, 1).map((stat, i) => (
                    <React.Fragment key={i}>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center group/box hover:bg-white/[0.07] transition-all">
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Avg {stat.name}</span>
                        <p className="text-2xl sm:text-3xl font-black text-white font-mono">{stat.avg}</p>
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center group/box hover:bg-white/[0.07] transition-all">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Consistency</span>
                          <div className="w-1 h-1 rounded-full bg-pink-400 animate-pulse" />
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-white font-mono">84%</p>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center group/box hover:bg-white/[0.07] transition-all relative">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Volatility</span>
                          <InfoTooltip content="Measures price movement intensity as a relative index." />
                        </div>
                        <p className="text-2xl sm:text-3xl font-black text-white font-mono">12.4</p>
                      </div>
                    </React.Fragment>
                  ))}
                </div>


              <div className="space-y-4 pt-4 border-t border-white/5 hidden">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={12} className="text-primary" />
                  Stat Profile Analysis
                </h3>
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Consistency Rating</span>
                      <span className="text-xs font-bold text-emerald-400">84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 w-[84%]" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Market Efficiency</span>
                      <span className="text-xs font-bold text-blue-400">High</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-medium leading-relaxed uppercase tracking-wider">
                      Price discovery for this player tends to stabilize quickly across sportsbooks.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Performance Graph & Markets */}
          <div className="lg:col-span-8 space-y-6">
            {/* Performance History */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(61,225,0,0.5)]" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Performance History</h2>
                  </div>
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
                          <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Graph</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.props.map((prop) => {
                          const opponent = prop.games?.home_team === data.player.team ? prop.games?.away_team : prop.games?.home_team;
                          const value = prop.current_value || prop.line;
                          const hasGraph = data.history.some(h => h.prop_id === prop.id);
                          
                          return (
                            <tr key={prop.id} className="group hover:bg-white/[0.02] transition-colors">
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
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  {hasGraph ? (
                                    <button
                                      onClick={() => {
                                        setSelectedPropId(prop.id);
                                        setViewMode('graph');
                                      }}
                                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black transition-all group/btn"
                                    >
                                      <TrendingUp size={12} className="group-hover/btn:scale-110 transition-transform" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">View</span>
                                    </button>
                                  ) : (
                                    <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center opacity-20">
                                      <Activity size={12} />
                                    </div>
                                  )}
                                </div>
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group"
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
                      lastUpdated={selectedProp.updated_at}
                      isLive={selectedProp.games?.status === 'live'}
                      status={selectedProp.status}
                    />
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </div>


      <Navbar />
    </div>
  )
}

export default function PlayerProfilePage() {
  return (
    <TooltipProvider>
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#020420] flex items-center justify-center">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <PlayerProfileContent />
      </React.Suspense>
    </TooltipProvider>
  )
}

