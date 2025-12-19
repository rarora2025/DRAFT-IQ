'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity } from 'lucide-react'
import { TradingChart } from '@/components/TradingChart'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useNBAData } from '@/hooks/useNBAData'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'
import { useTheme } from '@/hooks/useTheme'
import Image from 'next/image'

const LEVERAGE = 100
const LIQUIDATION_THRESHOLD = -0.9

export default function TradingPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    games,
    selectedGame,
    props,
    selectedProp,
    history,
    loading: nbaLoading,
    selectGame,
    selectProp
  } = useNBAData()
  
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const { positions, openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const liquidatingRef = useRef<Set<string>>(new Set())
  const { theme, toggleTheme } = useTheme()

  const currentPrice = selectedProp?.current_value || selectedProp?.line || 0
  const openingPrice = history.length > 0 ? history[0].value : currentPrice
  const change = currentPrice - openingPrice

  const groupedProps = useMemo(() => {
    const groups: { [player: string]: typeof props } = {}
    props.forEach(p => {
      if (!groups[p.player_name]) groups[p.player_name] = []
      groups[p.player_name].push(p)
    })
    return groups
  }, [props])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedProps
    const search = searchQuery.toLowerCase()
    const filtered: typeof groupedProps = {}
    Object.keys(groupedProps).forEach(player => {
      if (player.toLowerCase().includes(search)) {
        filtered[player] = groupedProps[player]
      }
    })
    return filtered
  }, [groupedProps, searchQuery])

  const unrealizedPnl = useMemo(() => {
    return positions.reduce((total, pos) => {
      if (!selectedProp || pos.market_id !== selectedProp.id) return total
      const diff = currentPrice - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * LEVERAGE * percentChange
        : -pos.size * LEVERAGE * percentChange
      return total + pnl
    }, 0)
  }, [positions, currentPrice, selectedProp])

  useEffect(() => {
    if (!profile) return

    positions.forEach(async (pos) => {
      if (liquidatingRef.current.has(pos.id)) return
      if (!selectedProp || pos.market_id !== selectedProp.id) return

      const diff = currentPrice - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * LEVERAGE * percentChange
        : -pos.size * LEVERAGE * percentChange
      const pnlRatio = pnl / pos.size

      if (pnlRatio <= LIQUIDATION_THRESHOLD) {
        liquidatingRef.current.add(pos.id)
        const finalPnl = await closePosition(pos.id, currentPrice)
        if (finalPnl !== undefined) {
          const returnAmount = Math.max(0, pos.size + finalPnl)
          await updateBalance(profile.balance + returnAmount)
        }
        liquidatingRef.current.delete(pos.id)
      }
    })
  }, [positions, currentPrice, profile, closePosition, updateBalance, selectedProp])

  const totalValue = useMemo(() => {
    return (profile?.balance ?? 0) + unrealizedPnl
  }, [profile?.balance, unrealizedPnl])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!profile || !selectedProp) return

    await openPosition(side, size, currentPrice, selectedProp.id)
    await updateBalance(profile.balance - size)
  }

  const handleClosePosition = async (positionId: string) => {
    if (!profile) return

    setClosingPosition(positionId)
    try {
      const position = positions.find(p => p.id === positionId)
      if (!position) return

      const pnl = await closePosition(positionId, currentPrice)
      if (pnl !== undefined) {
        const returnAmount = Math.max(0, position.size + pnl)
        await updateBalance(profile.balance + returnAmount)
      }
    } finally {
      setClosingPosition(null)
    }
  }

  const isDark = theme === 'dark'

  if (authLoading || nbaLoading || profileLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Loading NBA data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} pb-24`}>
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl">
              <span className="text-orange-500">NBA</span>
              <span className={isDark ? 'text-zinc-400' : 'text-gray-400'}> Hot </span>
              <span className="text-blue-500">Cold</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Live Prop Trading</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:bg-[#1c1c24]' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
            <div className={`rounded-xl px-4 py-2 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>${profile?.balance.toFixed(2)}</span>
              </div>
              <p className={`text-[10px] text-center ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Balance</p>
            </div>
          </div>
        </header>

        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={`w-full rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:border-emerald-500/30' : 'bg-white border border-gray-200 hover:border-emerald-500/50 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left overflow-hidden">
                <p className={`font-medium truncate ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                  {selectedProp ? `${selectedProp.player_name} - ${selectedProp.prop_type}` : 'Select Player Prop'}
                </p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {selectedGame ? `${selectedGame.away_team} @ ${selectedGame.home_team}` : 'NBA Market'}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${isDark ? 'text-zinc-400' : 'text-gray-400'} ${showPicker ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-lg'}`}
              >
                <div className={`p-3 border-b ${isDark ? 'border-[#27272a]' : 'border-gray-200'}`}>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      placeholder="Search player..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#0a0a0f] border border-[#27272a] text-zinc-200 placeholder:text-zinc-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {Object.keys(filteredGroups).map((player) => (
                    <div key={player} className="border-b border-zinc-800/50">
                      <div className={`px-4 py-2 bg-zinc-800/20 text-xs font-bold text-zinc-500 uppercase tracking-wider`}>
                        {player}
                      </div>
                      {filteredGroups[player].map((prop) => (
                        <button
                          key={prop.id}
                          onClick={() => {
                            selectProp(prop.id)
                            setShowPicker(false)
                            setSearchQuery('')
                          }}
                          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-[#1c1c24]' : 'hover:bg-gray-50'} ${
                            prop.id === selectedProp?.id ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
                          }`}
                        >
                          <span className={`text-sm ${prop.id === selectedProp?.id ? 'text-emerald-400 font-medium' : (isDark ? 'text-zinc-300' : 'text-gray-700')}`}>
                            {prop.prop_type}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-zinc-500">Line: {prop.line}</span>
                            {prop.id === selectedProp?.id && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  {Object.keys(filteredGroups).length === 0 && (
                    <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                      No players found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedProp ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
            >
              <div className="text-center mb-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Live Projection</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-6xl font-display font-bold tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {currentPrice.toFixed(1)}
                    </span>
                    <span className="text-xl text-zinc-500 font-medium">{selectedProp.prop_type}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-bold ${change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {change >= 0 ? '+' : ''}{change.toFixed(2)} since open
                  </div>
                </div>
              </div>

              <TradingChart
                currentTemp={currentPrice}
                history={history.map(h => ({ ...h, temp: h.value }))}
                dailyHigh={selectedProp.line + 5}
                dailyLow={Math.max(0, selectedProp.line - 5)}
                projectedHigh={currentPrice}
                isDark={isDark}
                cityName={selectedProp.player_name}
                latitude={0}
                longitude={0}
              />
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className={`text-sm mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Target Line</div>
                <div className={`font-mono font-bold text-lg ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                  {selectedProp.line}
                </div>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className={`text-sm mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Unrealized P/L</div>
                <div className={`font-mono font-bold text-lg flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                </div>
              </div>
            </div>

            <TradePanel
              balance={profile?.balance ?? 0}
              currentTemp={currentPrice}
              onTrade={handleTrade}
              isDark={isDark}
            />

            {positions.length > 0 && (
              <div className="space-y-3">
                <h2 className={`font-display font-semibold text-lg ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>Active Trades</h2>
                <AnimatePresence mode="popLayout">
                  {positions.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      currentTemp={currentPrice}
                      onClose={handleClosePosition}
                      loading={closingPosition === position.id}
                      isDark={isDark}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Prop Selected</h2>
            <p className="text-zinc-500">Select a player and prop type above to start trading</p>
            <button 
              onClick={() => setShowPicker(true)}
              className="mt-6 px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
            >
              Browse Props
            </button>
          </div>
        )}

        <div className={`flex items-center justify-center gap-2 pt-4 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          <span className="text-xs">Data provided by</span>
          <span className="text-xs font-bold text-zinc-400">SportsData.io</span>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
