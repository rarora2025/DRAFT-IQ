'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft, Info } from 'lucide-react'
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
import { useOnboarding } from '@/components/OnboardingProvider'
import { getTeamLogoUrl } from '@/lib/team-utils'

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
    const { showRules } = useOnboarding()

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Trading Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/markets/${gameId}`} className="p-2.5 rounded-xl transition-colors bg-card border border-border hover:bg-accent/30">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 bg-card flex items-center justify-center shadow-lg shadow-primary/5 shrink-0">
                    {selectedProp?.photo_url ? (
                      <img 
                        src={selectedProp.photo_url} 
                        alt={selectedProp.player_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = selectedProp.team ? getTeamLogoUrl(selectedProp.team, selectedProp.sport || 'nba') : '';
                        }}
                      />
                    ) : selectedProp?.team ? (
                      <img 
                        src={getTeamLogoUrl(selectedProp.team, selectedProp.sport || 'nba')} 
                        alt={selectedProp.team}
                        className="w-10 h-10 object-contain opacity-80"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary/40" />
                    )}
                  </div>
                      <div>
                      <h1 className="font-display font-black text-2xl sm:text-3xl leading-none uppercase tracking-tight text-white">
                        {selectedProp?.player_name || 'Loading...'}
                      </h1>
                    </div>

              </div>
            </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={showRules}
                  className="p-2.5 rounded-xl transition-colors bg-card border border-border hover:bg-accent/30"
                >
                  <Info className="w-5 h-5 text-primary" />
                </button>
                <div className="rounded-2xl px-5 py-2.5 bg-card border border-border shadow-md">
                <div className="flex items-center gap-2 mb-0.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-mono font-black text-white">${profile?.balance.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">Balance</p>
              </div>
            </div>
          </header>

        <div className="relative">
          <div
            className="w-full rounded-2xl px-5 py-4 flex items-center justify-between bg-card border border-border shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="font-bold text-white text-lg leading-tight truncate">
                  {propDisplayName}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
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
                className="rounded-3xl p-8 bg-card border border-border shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
                
                <div className="text-center mb-8 relative z-10">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Live Prediction</span>
                    </div>
                      <div className="flex flex-col items-center">
                        <span className="text-7xl sm:text-9xl font-display font-black tabular-nums tracking-tighter text-white drop-shadow-2xl">
                          {currentPrice.toFixed(1)}
                        </span>
                        <div className="mt-2 h-1 w-20 bg-primary/20 rounded-full" />
                        <span className="text-lg text-muted-foreground font-black uppercase tracking-[0.3em] mt-2">{propDisplayName}</span>
                      </div>

                    <div className={`flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full text-xs font-black border transition-colors ${displayChange?.isUp ? 'bg-primary/10 text-primary border-primary/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {displayChange?.isUp ? <TrendingUp className="w-4 h-4 shadow-sm" /> : <TrendingDown className="w-4 h-4 shadow-sm" />}
                      {displayChange?.text}
                    </div>
                  </div>
                </div>

                <TradingChart
                  currentValue={currentPrice}
                  history={history}
                  line={selectedProp.line}
                  isDark={true}
                  playerName={selectedProp.player_name}
                  propType={propDisplayName}
                />
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Line</div>
                    <InfoTooltip content="The official betting line for this prop. Your trade is based on whether the final score will be over or under this value." isDark={true} />
                  </div>
                  <div className="font-mono font-black text-3xl text-white">
                    {selectedProp.line}
                  </div>
                </div>
                <div className="rounded-2xl p-5 bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unrealized P/L</div>
                    <InfoTooltip content="Profit/Return Ratio. Your current estimated profit or loss if you were to close your active positions right now." isDark={true} />
                  </div>
                  <div className={`font-mono font-black text-3xl flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                  </div>
                </div>
              </div>

              <TradePanel
                balance={profile?.balance ?? 0}
                currentTemp={currentPrice}
                onTrade={handleTrade}
                isDark={true}
                propType={propDisplayName}
              />

              {activePositions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="font-display font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Positions</h2>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {activePositions.map((position) => (
                      <PositionCard
                        key={position.id}
                        position={position}
                        currentTemp={currentPrice}
                        onClose={handleClosePosition}
                        loading={closingPosition === position.id}
                        isDark={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 bg-card border border-border border-dashed rounded-3xl">
              <Trophy className="w-20 h-20 text-muted mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">No Market Selected</h2>
              <p className="text-muted-foreground px-6">Select a prop type from the game list to begin your professional trade.</p>
            </div>
          )}


        </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
