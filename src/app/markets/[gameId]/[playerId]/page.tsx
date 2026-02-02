'use client'

import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft, Info, Calendar, Lock, BarChart3, LineChart, Gauge, Clock } from 'lucide-react'
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
import { isMarketLocked, cn } from '@/lib/utils'

const PROP_NAMES: Record<string, string> = {
  'player_points': 'Points',
  'player_rebounds': 'Rebounds',
  'player_assists': 'Assists',
  'player_steals': 'Steals',
  'player_blocks': 'Blocks',
  'player_pass_yds': 'Passing Yards',
  'player_rush_yds': 'Rushing Yards',
  'player_reception_yds': 'Receiving Yards',
}

function TradingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
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

  const adminUserIds = (process.env.NEXT_PUBLIC_ADMIN_USER_ID || '').split(',')
  const isAdmin = user?.id ? adminUserIds.includes(user.id) : false

  // Instrumentation
  useEffect(() => {
    if (!selectedProp || !user?.id) return

    const logViewEvents = () => {
      // 1. Log market_viewed
      fetch('/api/v1-metrics/log', {
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
        } as any)
      })

      // 2. Log user_returned_same_game
      const storageKey = `last_viewed_${playerId}`
      const lastViewed = localStorage.getItem(storageKey)
      const now = Date.now()

      if (lastViewed) {
        const diffMinutes = Math.floor((now - parseInt(lastViewed)) / (1000 * 60))
        if (diffMinutes > 0) {
          fetch('/api/v1-metrics/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventName: 'user_returned_same_game',
              userId: user.id,
              marketId: playerId,
              properties: {
                minutes_since_last_view: diffMinutes
              }
            } as any)
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

  // Pull to refresh / scroll reload logic
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = async () => {
      const currentScrollY = window.scrollY
      
      // If at top and scrolling further up (or just at top)
      if (currentScrollY <= 0 && lastScrollY.current > 0 && !isRefreshing) {
        setIsRefreshing(true)
        await refresh()
        setTimeout(() => setIsRefreshing(false), 1000)
      }
      
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [refresh, isRefreshing])

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
            
            fetch('/api/v1-metrics/log', {
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
              } as any)
            }).catch(() => {})
          } else {
            await openPosition(
              side,
              size,
              executionPrice, 
              selectedProp.id,
              `${selectedProp.player_name} - ${PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}`
            )
          
            fetch('/api/v1-metrics/log', {
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
              } as any)
            }).catch(() => {})
          }

              // Fire and forget refetches to keep UI snappy
              refresh()
              refetchVault()
              refetchQueuedTrades()
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

        fetch('/api/v1-metrics/log', {
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
          } as any)
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

  const marketStats = useMemo(() => {
    if (!history || history.length === 0) return null
    const values = history.map(h => h.value).filter(v => v !== null) as number[]
    return {
      high: Math.max(...values, currentPrice),
      low: Math.min(...values, currentPrice),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      vol: values.length * 10.5 // Simulated volume
    }
  }, [history, currentPrice])

  if (authLoading || nbaLoading || vaultLoading) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing market data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020420] pb-24 text-white overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] -ml-96 -mb-96 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-8 relative z-10 space-y-6 sm:space-y-8">
          {/* Header & Back Navigation */}
          <div className="flex items-center justify-between">
            <Link 
              href={`/markets/${gameId}?sport=${searchParams.get('sport')}`} 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Back to Markets</span>
            </Link>
          </div>

          {/* Market Locked Banner */}
          {selectedProp && isMarketLocked(selectedProp.status) && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-400/20 border border-red-400/30 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_30px_rgba(248,113,113,0.15)]"
            >
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center shrink-0 border border-red-400/30">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Market Locked</h3>
                <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Trading is temporarily suspended for this prop</p>
              </div>
            </motion.div>
          )}

        {selectedProp ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* Player Header (Full Width above Grid) */}
            <div className="lg:col-span-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6 w-full">
                  <div className="relative group shrink-0">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity rounded-full" />
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl relative z-10">
                      {selectedProp.photo_url ? (
                        <img src={selectedProp.photo_url} alt={selectedProp.player_name} className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-10 h-10 text-zinc-800" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase tracking-[0.2em]">
                        {PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
                      </span>
                    </div>
                      <div className="flex items-center w-full">
                        <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tighter leading-none">
                          {selectedProp.player_name}
                        </h1>
                      </div>

                  </div>
                </div>
              </motion.div>
            </div>

            {/* Trading Terminal & Positions (Left on Laptop) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
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
                  playerId={playerId}
                />
              </motion.div>

              {/* Market Stats Row */}
              {marketStats && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide"
                >
                  {[
                    { 
                      label: '24h High', 
                      value: marketStats.high.toFixed(1), 
                      sub: 'Peak',
                      color: 'text-emerald-400',
                    },
                    { 
                      label: '24h Low', 
                      value: marketStats.low.toFixed(1), 
                      sub: 'Floor',
                      color: 'text-red-400',
                    },
                    { 
                      label: 'Last Updated', 
                      value: (selectedProp as any).last_update ? new Date((selectedProp as any).last_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---', 
                      sub: selectedGame?.status === 'live' ? 'LIVE' : (selectedGame?.status === 'completed' ? 'FINAL' : 'UPCOMING'),
                      color: 'text-amber-400',
                    },
                  ].map((stat, i) => (
                    <div key={i} className="flex-1 min-w-[80px] bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center justify-center gap-0.5 backdrop-blur-sm relative group/stat">
                      <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-zinc-500 text-center w-full">{stat.label}</span>
                      <span className={`text-[11px] sm:text-[13px] font-black font-mono ${stat.color || 'text-white'} whitespace-nowrap text-center`}>{stat.value}</span>
                      <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-zinc-600 text-center">{stat.sub}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Positions Section (Below Trade Panel on Laptop) */}
              <AnimatePresence>
                {activePositions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Active Positions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-primary" />
                          <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Your Positions</h2>
                        </div>

                        <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded border border-primary/20">
                          {activePositions.length} Positions
                        </span>
                      </div>
                      
                      <div className="space-y-3 min-h-[100px] flex flex-col">
                        <AnimatePresence mode="popLayout">
                          {activePositions.map((position, i) => (
                            <motion.div
                              key={position.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
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
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Graph Section (Right on Laptop) */}
            <div className="lg:col-span-5 space-y-6 sm:space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <TradingChart 
                    history={history} 
                    currentValue={currentPrice}
                    propType={PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
                    line={selectedProp.line || 0}
                    lastUpdated={selectedProp.last_update}
                    isLive={selectedGame?.status === 'live'}
                    status={selectedProp.status}
                    isAdmin={isAdmin}
                    percentChange={currentPercentChange}
                  />

                  <Link 
                    href={`/players/${selectedProp.player_id}`}
                    className="block w-full"
                  >
                  <Button 
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/50 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[10px] h-14 rounded-2xl group transition-all"
                  >
                    <BarChart3 className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                    View Player Performance History
                  </Button>
                </Link>
              </motion.div>
            </div>

          </div>
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

export default function TradingPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing market data...</p>
      </div>
    }>
      <TradingPageContent />
    </React.Suspense>
  )
}
