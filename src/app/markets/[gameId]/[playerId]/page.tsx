'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft, Info, Calendar, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { TradingChart } from '@/components/TradingChart'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useNBAData } from '@/hooks/useNBAData'
import { useProfile } from '@/hooks/useProfile'
import { useVault } from '@/hooks/useVault'
import { usePositions } from '@/hooks/usePositions'
import { useQueuedTrades } from '@/hooks/useQueuedTrades'
import { getTeamLogoUrl } from '@/lib/team-utils'
import { isMarketLocked } from '@/lib/utils'

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

export default function TradingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params?.gameId as string
  const playerId = params?.playerId as string
  const playerNameUrl = searchParams.get('name')

  const { user, loading: authLoading } = useAuth()
  const {
      selectedGame,
      props,
      selectedProp,
      history,
      loading: nbaLoading,
      refresh
    } = useNBAData(gameId, playerId)
    
  const isCompleted = selectedGame?.status === 'completed'

    const { profile, positions, total_portfolio_value, balance: cashBalance, loading: vaultLoading, refetch: refetchVault } = useVault(user?.id)
    const { updateDefaultTolerance } = useProfile(user?.id)
    const { openPosition, closePosition } = usePositions(user?.id)
      const { queuedTrades, queueOpenTrade, queueCloseTrade, cancelQueuedTrade, getQueuedTradesForProp, getPendingCloseForPosition, refetch: refetchQueuedTrades } = useQueuedTrades(user?.id)
      const [closingPosition, setClosingPosition] = useState<string | null>(null)
      const [isDark] = useState(true)
      
      const defaultTolerance = profile?.default_tolerance ?? 5

      const isLiveGame = selectedGame?.status === 'live'

  // No targeted sync on mount, relying on server-side schedule
  useEffect(() => {
    if (!gameId) return;
  }, [gameId])

  // Instrumentation
  useEffect(() => {
    if (!selectedProp || !user?.id) return

    const logViewEvents = async () => {
      // 1. Log market_viewed
      await fetch('/api/v1-metrics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'market_viewed',
          userId: user.id,
          marketId: playerId,
          properties: {
            reference_value: currentPrice,
            market_status: selectedProp.status
          }
        })
      })

      // 2. Log user_returned_same_game
      const storageKey = `last_viewed_${playerId}`
      const lastViewed = localStorage.getItem(storageKey)
      const now = Date.now()

      if (lastViewed) {
        const diffMinutes = Math.floor((now - parseInt(lastViewed)) / (1000 * 60))
        if (diffMinutes > 0) {
          await fetch('/api/v1-metrics/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventName: 'user_returned_same_game',
              userId: user.id,
              marketId: playerId,
              properties: {
                minutes_since_last_view: diffMinutes
              }
            })
          })
        }
      }
      localStorage.setItem(storageKey, now.toString())
    }

    logViewEvents()
  }, [playerId, user?.id, !!selectedProp])

    const currentPrice = selectedProp?.current_value || selectedProp?.line || 0
    const basePrice = history && history.length > 0 ? history[0].value : (selectedProp?.line || currentPrice)

    const currentPercentChange = useMemo(() => {
      if (!history || history.length === 0) return 0
      const firstValidPoint = history.find(p => p.value !== null)
      const firstValue = firstValidPoint?.value || 0
      if (firstValue === 0) return 0
      return ((currentPrice - firstValue) / firstValue) * 100
    }, [history, currentPrice])

    const activePositions = useMemo(() => {
    return positions.filter(p => p.player_prop_id === playerId)
  }, [positions, playerId])

        const handleTrade = async (side: 'long' | 'short', size: number, price?: number, limitPrice?: number, toleranceOverride?: number) => {
            if (!user || !selectedProp || !profile) return
            
            try {
              const userBalanceBefore = profile.balance
              const executionPrice = price ?? currentPrice
              
              if (isLiveGame) {
                await queueOpenTrade(
                  side,
                  size,
                  executionPrice,
                  selectedProp.id,
                  `${selectedProp.player_name} - ${PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}`,
                  limitPrice,
                  toleranceOverride
                )
            
            await fetch('/api/v1-metrics/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventName: 'trade_queued',
                userId: user.id,
                marketId: playerId,
                properties: {
                  submitted_price: executionPrice,
                  size,
                  direction: side,
                  user_balance_before: userBalanceBefore,
                  is_live_game: true
                }
              })
            })
          } else {
            await openPosition(
              side,
              size,
              executionPrice, 
              selectedProp.id,
              `${selectedProp.player_name} - ${PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}`
            )
          
            await fetch('/api/v1-metrics/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                eventName: 'trade_opened',
                userId: user.id,
                marketId: playerId,
                properties: {
                  entry_reference_value: executionPrice,
                  size,
                  direction: side,
                  user_balance_before: userBalanceBefore
                }
              })
            })
          }

          await Promise.all([
            refresh(),
            refetchVault(),
            refetchQueuedTrades()
          ])
          router.push('/portfolio')
        } catch (error) {
        console.error('Trade failed:', error)
        throw error
      }
    }

    const handleClosePosition = async (positionId: string, exitPrice?: number, limitPrice?: number) => {
      if (!profile || !selectedProp) return
      const position = activePositions.find(p => p.id === positionId)
      if (!position) return

      setClosingPosition(positionId)
      try {
        const finalPrice = exitPrice ?? currentPrice
        
        const result = await closePosition(positionId, finalPrice)
        
        const heldMinutes = Math.floor((Date.now() - new Date(position.created_at).getTime()) / (1000 * 60))
        const pnl = (result as any)?.pnl || 0

        await fetch('/api/v1-metrics/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'trade_closed',
            userId: user?.id,
            marketId: playerId,
            properties: {
              exit_reference_value: finalPrice,
              pnl,
              reason: 'user_closed',
              held_minutes: heldMinutes
            }
          })
        })

        console.log('Close result:', result)
        
      await Promise.all([
        refresh(),
        refetchVault(),
        refetchQueuedTrades()
      ])
    } catch (error: any) {
      console.error('Closing failed:', error)
      alert(error.message || 'Failed to close position')
    } finally {
      setClosingPosition(null)
    }
  }

  const handlePriceCheck = async () => {
    try {
      const res = await fetch(`/api/props/${playerId}`)
      if (!res.ok) return { price: currentPrice, status: selectedProp?.status, lastUpdated: (selectedProp as any)?.last_update }
      const data = await res.json()
      return {
        price: data.prop?.current_value || data.prop?.line || currentPrice,
        status: data.prop?.status,
        lastUpdated: data.prop?.updated_at || data.prop?.last_update
      }
    } catch (error) {
      console.error('Price check failed:', error)
      return { price: currentPrice, status: selectedProp?.status, lastUpdated: (selectedProp as any)?.last_update }
    }
  }

  if (authLoading || nbaLoading || vaultLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020420] pb-24 text-white overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -ml-64 -mb-64 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

        <div className="max-w-lg mx-auto px-4 py-6 relative z-10 space-y-8">
          {/* Market Locked Banner */}
          {selectedProp && isMarketLocked(selectedProp.status) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Market Locked</h3>
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Trading is temporarily suspended for this prop</p>
              </div>
            </motion.div>
          )}

          {/* Header */}

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Link href={`/markets/${gameId}?sport=${searchParams.get('sport')}`} className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
            <div className="p-2 rounded-xl group-hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Back to Markets</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Available Credit</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xl font-black text-white font-mono">${cashBalance.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
        </motion.div>

        {selectedProp ? (
          <>
            {/* Player Profile Section */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity rounded-full" />
                  <div className="flex items-center gap-6 relative">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl relative">
                        {selectedProp.photo_url ? (
                          <img src={selectedProp.photo_url} alt={selectedProp.player_name} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-12 h-12 text-zinc-800" />
                          </div>
                        )}
                      </div>
                    </div>
    
                              <div className="flex-1 space-y-1">
                                    <div className="flex flex-col gap-3">
                                      <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
                                        {selectedProp.player_name}
                                      </h1>
                                      <div className="flex items-center gap-2">
                                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-black font-mono text-xs ${currentPercentChange >= 0 ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'}`}>
                                          {currentPercentChange >= 0 ? '▲' : '▼'}
                                          {Math.abs(currentPercentChange).toFixed(1)}%
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                              </div>
                      </motion.div>


            {/* Main Interactive Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
                <TradingChart 
                  history={history} 
                  currentValue={currentPrice}
                  propType={PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
                  line={selectedProp.line || 0}
                  lastUpdated={selectedProp.last_update}
                  isLive={selectedGame?.status === 'live'}
                  status={selectedProp.status}
                />


              <TradePanel
                    balance={profile?.balance || 0}
                    currentTemp={currentPrice}
                    onTrade={handleTrade}
                    onPriceCheck={handlePriceCheck}
                    disabled={isCompleted}
                    propType={PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
                    marketStatus={selectedProp.status}
                    lastUpdated={(selectedProp as any).last_update}
                    isLiveGame={isLiveGame}
                      queuedTrades={getQueuedTradesForProp(playerId)}
                      onCancelQueuedTrade={cancelQueuedTrade}
                      defaultTolerance={defaultTolerance}
                      onUpdateDefaultTolerance={updateDefaultTolerance}
                    />

            </motion.div>

            {/* Active Positions with Enhanced Visuals */}
            <AnimatePresence>
              {activePositions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full" />
                      <h2 className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-500">Active Trades</h2>
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                      {activePositions.length} Open
                    </span>
                  </div>
                  
                  <div className="relative rounded-[2.5rem] p-1 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white/5 to-blue-500/5 animate-gradient" />
                    <div className="relative bg-[#020420]/80 backdrop-blur-3xl rounded-[2.4rem] p-6 space-y-4 border border-white/5 shadow-2xl">
                      {activePositions.map((position, i) => (
                        <motion.div
                          key={position.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                        >
                          <PositionCard
                              position={position}
                              currentTemp={(position as any).current_price || currentPrice}
                              onClose={handleClosePosition}
                              onPriceCheck={handlePriceCheck}
                              loading={closingPosition === position.id}
                              isDark={true}
                              lastUpdated={(selectedProp as any).last_update}
                              isLiveGame={isLiveGame}
                              pendingClose={getPendingCloseForPosition(position.id)}
                              onCancelQueuedTrade={cancelQueuedTrade}
                            />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 space-y-6"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <Trophy className="w-10 h-10 text-zinc-800" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Terminal Offline</h2>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                Select an active market from the dashboard to initialize trade
              </p>
            </div>
            <Link href="/markets">
              <Button className="bg-primary text-black font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl">
                Browse Markets
              </Button>
            </Link>
          </motion.div>
        )}
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}
