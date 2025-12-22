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
    
  const isExpired = selectedProp?.status === 'expired'
  const isCompleted = selectedGame?.status === 'completed'

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

      // Trigger sync for this game to get the latest line for closing
      await fetch(`/api/sync?gameId=${gameId}`).catch(console.error)
      
      const pnl = await closePosition(positionId, currentPrice)
      if (pnl !== undefined) {
        const returnAmount = Math.max(0, position.size + pnl)
        await updateBalance(profile.balance + returnAmount)
      }
    } finally {
      setClosingPosition(null)
    }
  }

  const handlePriceCheck = async () => {
    try {
      // Fast sync for this game
      await fetch(`/api/sync?gameId=${gameId}`)
      
      // Fetch updated props from our DB
      const propsRes = await fetch(`/api/games/${gameId}/props`)
      const propsData = await propsRes.json()
      const updatedProp = propsData.props?.find((p: any) => p.id === playerId)
      
      if (updatedProp) {
        refresh() // Update the local state
        return updatedProp.line
      }
      return currentPrice
    } catch (error) {
      console.error('Price check failed:', error)
      return currentPrice
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

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center border-4 border-muted/20">
          <Trophy className="w-16 h-16 text-muted-foreground opacity-50" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Game Completed</h1>
          <p className="text-muted-foreground max-w-xs mx-auto text-lg italic">
            Trading is closed for this matchup. All final results are being processed.
          </p>
        </div>
        <Link href="/markets" className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
          Back to Markets
        </Link>
        <Navbar isDark={true} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
          <header className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={`/markets/${gameId}`} className="p-2.5 rounded-xl transition-colors bg-card border border-border hover:bg-accent/30 shrink-0">
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 bg-card flex items-center justify-center shadow-lg shadow-primary/5 shrink-0">
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
                        className="w-12 h-12 object-contain opacity-80"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary/40" />
                    )}
                  </div>
                      <div className="min-w-0">
                        <h1 className="font-display font-black text-lg sm:text-xl leading-tight uppercase tracking-tight text-white line-clamp-2">
                          {selectedProp?.player_name || 'Loading...'}
                        </h1>
                      </div>

              </div>
            </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="rounded-xl px-4 py-2.5 bg-card border border-border shadow-md min-w-[100px]">
                  <div className="flex items-center gap-1.5 justify-center mb-0.5">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-mono font-black text-white text-base sm:text-lg">
                      ${profile?.balance.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[8px] text-center font-bold text-muted-foreground uppercase tracking-widest">Vault</p>
                </div>
              </div>
          </header>

        <div className="relative">
            <div
              className="w-full rounded-2xl px-5 py-4 flex items-center justify-between bg-card border border-border shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="text-left overflow-hidden">
                    <p className="font-bold text-white text-lg leading-tight">
                      {propDisplayName}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                      {selectedGame ? `${selectedGame.away_team} @ ${selectedGame.home_team}` : (selectedProp?.sport?.toUpperCase() || 'NBA') + ' GAME'}
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

                <TradePanel
                  balance={profile?.balance ?? 0}
                  currentTemp={currentPrice}
                  onTrade={handleTrade}
                  onPriceCheck={handlePriceCheck}
                  isDark={true}
                  propType={propDisplayName}
                  isExpired={isExpired}
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
