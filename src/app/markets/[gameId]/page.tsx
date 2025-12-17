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

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Player Props</h1>
          <p className="text-zinc-400">Trade on live player performance</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">Loading props...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {props.map((prop) => {
              const distanceToLine = prop.current_value - prop.line
              const isOver = distanceToLine > 0

              return (
                <div
                  key={prop.id}
                  className="bg-[#111116] border border-[#27272a] rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {prop.player_name}
                      </h3>
                      <p className="text-zinc-400 text-sm">{prop.prop_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-400 font-semibold uppercase">
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Line</p>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {prop.line}
                      </p>
                    </div>
                    <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">Current</p>
                      <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                        {prop.current_value}
                      </p>
                    </div>
                    <div className="bg-[#0a0a0f] rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-1">To Line</p>
                      <div className="flex items-center justify-center gap-1">
                        {isOver ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <p
                          className={`text-2xl font-bold tabular-nums ${
                            isOver ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isOver ? '+' : ''}
                          {distanceToLine.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleTrade(prop, 'over')}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-lg p-4 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-emerald-400">
                          OVER
                        </span>
                        <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-zinc-400 mb-1">Odds</p>
                        <p className="text-lg font-bold text-white tabular-nums">
                          {formatOdds(prop.over_odds)}
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleTrade(prop, 'under')}
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg p-4 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-400">
                          UNDER
                        </span>
                        <TrendingDown className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-zinc-400 mb-1">Odds</p>
                        <p className="text-lg font-bold text-white tabular-nums">
                          {formatOdds(prop.under_odds)}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && props.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No props available for this game</p>
          </div>
        )}
      </div>

      {selectedProp && side && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111116] border border-[#27272a] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Trade</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-zinc-400">Player</span>
                <span className="text-white font-medium">
                  {selectedProp.player_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Prop</span>
                <span className="text-white font-medium">
                  {selectedProp.prop_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Line</span>
                <span className="text-white font-medium tabular-nums">
                  {selectedProp.line}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Side</span>
                <span
                  className={`font-medium uppercase ${
                    side === 'over' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {side}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Odds</span>
                <span className="text-white font-medium tabular-nums">
                  {formatOdds(
                    side === 'over' ? selectedProp.over_odds : selectedProp.under_odds
                  )}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedProp(null)
                  setSide(null)
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSelectedProp(null)
                  setSide(null)
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg transition-colors font-medium"
              >
                Place Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
