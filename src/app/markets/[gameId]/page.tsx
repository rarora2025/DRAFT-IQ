'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Link from 'next/link'

interface PlayerProp {
  id: string
  game_id: string
  player_id: string
  player_name: string
  prop_type: string
  line: number
  over_odds: number
  under_odds: number
  current_value: number
  status: 'active' | 'settled' | 'cancelled'
}

export default function GameDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params?.gameId as string
  const sport = (searchParams?.get('sport') as 'NFL' | 'NBA') || 'NFL'

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProp, setSelectedProp] = useState<PlayerProp | null>(null)
  const [side, setSide] = useState<'over' | 'under' | null>(null)

  useEffect(() => {
    fetchProps()
    const interval = setInterval(fetchProps, 5000)
    return () => clearInterval(interval)
  }, [gameId, sport])

  async function fetchProps() {
    try {
      const response = await fetch(`/api/games/${gameId}/props?sport=${sport}`)
      const data = await response.json()
      setProps(data.props || [])
    } catch (error) {
      console.error('Error fetching props:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleTrade(prop: PlayerProp, tradeType: 'over' | 'under') {
    setSelectedProp(prop)
    setSide(tradeType)
  }

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : odds.toString()
  }

  const groupedProps = useMemo(() => {
    const groups: { [player: string]: PlayerProp[] } = {}
    props.forEach(p => {
      if (!groups[p.player_name]) groups[p.player_name] = []
      groups[p.player_name].push(p)
    })
    return groups
  }, [props])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">NBA Player Props</h1>
            <p className="text-zinc-400">Trade on live performance lines</p>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-xl px-4 py-2 text-sm text-zinc-400">
            Game ID: <span className="text-white font-mono">{gameId}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">Loading props...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.keys(groupedProps).map((playerName) => (
              <div key={playerName} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight">{playerName}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedProps[playerName].map((prop) => {
                    const distanceToLine = prop.current_value - prop.line
                    const isOver = distanceToLine > 0

                    return (
                      <div
                        key={prop.id}
                        className="bg-[#111116] border border-[#27272a] rounded-xl p-5 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">{prop.prop_type}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 text-xs uppercase">LINE:</span>
                              <span className="text-white font-bold">{prop.line}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] text-zinc-400 font-bold">LIVE</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-[#0a0a0f] rounded-lg p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">Current</p>
                            <p className="text-xl font-bold text-white tabular-nums">
                              {prop.current_value.toFixed(1)}
                            </p>
                          </div>
                          <div className="bg-[#0a0a0f] rounded-lg p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-0.5">To Line</p>
                            <div className="flex items-center gap-1">
                              {isOver ? (
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-red-400" />
                              )}
                              <p className={`text-xl font-bold tabular-nums ${isOver ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isOver ? '+' : ''}{distanceToLine.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleTrade(prop, 'over')}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg py-2 transition-all group"
                          >
                            <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">OVER</span>
                            <span className="text-sm font-bold text-white">{formatOdds(prop.over_odds)}</span>
                          </button>

                          <button
                            onClick={() => handleTrade(prop, 'under')}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg py-2 transition-all group"
                          >
                            <span className="text-[10px] font-bold text-red-400 block mb-0.5">UNDER</span>
                            <span className="text-sm font-bold text-white">{formatOdds(prop.under_odds)}</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && props.length === 0 && (
          <div className="text-center py-20">
            <Activity className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500">No props currently available for this game</p>
          </div>
        )}
      </div>

      {selectedProp && side && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#111116] border border-[#27272a] rounded-2xl p-8 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Confirm Trade</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-sm">Player</span>
                <span className="text-white font-bold">{selectedProp.player_name}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-sm">Prop</span>
                <span className="text-emerald-400 font-bold">{selectedProp.prop_type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-sm">Line</span>
                <span className="text-white font-mono font-bold">{selectedProp.line}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-500 text-sm">Side</span>
                <span className={`font-bold uppercase px-3 py-1 rounded ${side === 'over' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {side}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Odds</span>
                <span className="text-white font-mono font-bold text-lg">
                  {formatOdds(side === 'over' ? selectedProp.over_odds : selectedProp.under_odds)}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedProp(null)
                  setSide(null)
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl transition-colors font-bold"
              >
                Cancel
              </button>
              <Link
                href="/"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl transition-colors font-bold text-center"
              >
                Trade Live
              </Link>
            </div>
          </motion.div>
        </div>
      )}
      
      <Navbar isDark={true} />
    </div>
  )
}
}
