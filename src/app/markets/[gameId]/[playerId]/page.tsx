'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { TradingChart } from '@/components/TradingChart'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useAuth } from '@/hooks/useAuth'
import { useNBAData } from '@/hooks/useNBAData'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'
import { useTheme } from '@/hooks/useTheme'

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

export default function TradingPage() {
  const params = useParams()
  const gameId = params?.gameId as string
  const playerId = params?.playerId as string

  const { user, loading: authLoading } = useAuth()
  const {
    selectedGame,
    props,
    selectedProp,
    history,
    loading: nbaLoading,
    refresh
  } = useNBAData(gameId, playerId)
  
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const { positions, openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const liquidatingRef = useRef<Set<string>>(new Set())
  const { theme } = useTheme()

  useEffect(() => {
    // Save current path as last viewed market
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastMarketPath', window.location.pathname)
    }
  }, [gameId, playerId])

  const currentPrice = selectedProp?.current_value || selectedProp?.line || 0
  const initialLine = history.length > 0 ? history[0].value : (selectedProp?.line || currentPrice)
  const diff = currentPrice - initialLine

  const propDisplayName = useMemo(() => {
    if (!selectedProp) return 'Prop'
    return PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type.replace(/_/g, ' ').replace('player ', '')
  }, [selectedProp])

  const displayChange = useMemo(() => {
    if (!selectedProp) return null
    return {
      value: Math.abs(diff).toFixed(2),
      isUp: diff >= 0,
      text: `MOVED ${Math.abs(diff).toFixed(2)} UNITS`
    }
  }, [currentPrice, initialLine, selectedProp, diff])

  const activePositions = useMemo(() => {
    return positions.filter(pos => pos.market_id === selectedProp?.id)
  }, [positions, selectedProp?.id])

  const unrealizedPnl = useMemo(() => {
    return activePositions.reduce((total, pos) => {
      const priceDiff = currentPrice - pos.entry_price
      const percentChange = priceDiff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * percentChange
        : -pos.size * percentChange
      return total + pnl
    }, 0)
  }, [activePositions, currentPrice])

  useEffect(() => {
    if (!profile) return

    activePositions.forEach(async (pos) => {
      if (liquidatingRef.current.has(pos.id)) return
      if (currentPrice === 0) return // Don't liquidate if price is 0 (likely locked/missing)

      const priceDiff = currentPrice - pos.entry_price
      const percentChange = priceDiff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * percentChange
        : -pos.size * percentChange
      
      if (pnl <= -pos.size * 0.9) {
        liquidatingRef.current.add(pos.id)
        const finalPnl = await closePosition(pos.id, currentPrice)
        if (finalPnl !== undefined) {
          const returnAmount = Math.max(0, pos.size + finalPnl)
          await updateBalance(profile.balance + returnAmount)
        }
        liquidatingRef.current.delete(pos.id)
      }
    })
  }, [activePositions, currentPrice, profile, closePosition, updateBalance])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!profile || !selectedProp) return

    // Trigger instant sync for this game
    fetch(`/api/sync?gameId=${gameId}`).catch(console.error)

    await openPosition(
      side, 
      size, 
      currentPrice, 
      selectedProp.id, 
      `${selectedProp.player_name} - ${propDisplayName}`
    )
    await updateBalance(profile.balance - size)
    
    // Refresh local data after a short delay to allow sync to complete
    setTimeout(refresh, 1000)
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
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Loading Trading Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} pb-24`}>
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/markets/${gameId}`} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:bg-[#1c1c24]' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}>
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </Link>
            <div>
                <h1 className="font-display font-bold text-xl">
                  <span className="text-white">Projection</span>
                  <span className="text-emerald-500"> Trading</span>
                </h1>
              <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                {selectedProp?.player_name || 'Loading...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl px-4 py-2 bg-[#111116] border border-[#27272a]`}>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className={`font-mono font-bold text-zinc-100`}>${profile?.balance.toFixed(2)}</span>
              </div>
              <p className={`text-[10px] text-center text-zinc-500`}>Balance</p>
            </div>
          </div>
        </header>

        <div className="relative">
          <div
            className={`w-full rounded-xl px-4 py-3 flex items-center justify-between ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left overflow-hidden">
                <p className={`font-medium truncate ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                  {propDisplayName}
                </p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                  {selectedGame ? `${selectedGame.away_team} @ ${selectedGame.home_team}` : 'Market'}
                </p>
              </div>
            </div>
          </div>
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
                    <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Live Prediction</span>
                  </div>
                  <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className={`text-5xl sm:text-7xl font-display font-black tabular-nums tracking-tighter shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {currentPrice.toFixed(1)}
                    </span>
                    <span className="text-sm sm:text-lg text-zinc-600 font-bold uppercase tracking-widest truncate">{propDisplayName}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 mt-4 px-4 py-1.5 rounded-full text-xs font-black ${displayChange?.isUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {displayChange?.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {displayChange?.text}
                  </div>
                </div>
              </div>

              <TradingChart
                currentValue={currentPrice}
                history={history}
                line={selectedProp.line}
                isDark={isDark}
                playerName={selectedProp.player_name}
                propType={propDisplayName}
              />
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Target Line</div>
                  <InfoTooltip content="The official betting line for this prop. Your trade is based on whether the final score will be over or under this value." isDark={isDark} />
                </div>
                <div className={`font-mono font-black text-2xl ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                  {selectedProp.line}
                </div>
              </div>
              <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Unrealized P/R</div>
                  <InfoTooltip content="Profit/Return Ratio. Your current estimated profit or loss if you were to close your active positions right now." isDark={isDark} />
                </div>
                <div className={`font-mono font-black text-2xl flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                </div>
              </div>
            </div>

            <TradePanel
              balance={profile?.balance ?? 0}
              currentTemp={currentPrice}
              onTrade={handleTrade}
              isDark={isDark}
              propType={propDisplayName}
            />

            {activePositions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className={`font-display font-black text-sm uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Active Positions</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE</span>
                </div>
                <AnimatePresence mode="popLayout">
                  {activePositions.map((position) => (
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
            <p className="text-zinc-500">Select a prop type above to start trading</p>
          </div>
        )}

        <div className={`flex items-center justify-center gap-2 pt-4 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Powered by</span>
          <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">The Odds API Enterprise</span>
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
