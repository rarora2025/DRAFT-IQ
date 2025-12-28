'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, Trophy, ChevronDown, Search, Sun, Moon, User, Activity, ArrowLeft, Info, Calendar } from 'lucide-react'
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
import { getTeamLogoUrl } from '@/lib/team-utils'

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
  const { openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [isDark] = useState(true)

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

  const activePositions = useMemo(() => {
    return positions.filter(p => p.player_prop_id === playerId)
  }, [positions, playerId])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!user || !selectedProp || !profile) return
    
    try {
      const userBalanceBefore = profile.balance
      // Use the hook which now uses the atomic RPC (balance update is handled in DB)
      await openPosition(
        side,
        size,
        currentPrice, 
        selectedProp.id,
        `${selectedProp.player_name} - ${PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}`
      )
      
        // Log trade_opened
        await fetch('/api/v1-metrics/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'trade_opened',
            userId: user.id,
            marketId: playerId,
            properties: {
              entry_reference_value: currentPrice,
              size,
              direction: side,
              user_balance_before: userBalanceBefore
            }
          })
        })

      // Refresh all related data
      await Promise.all([
        refresh(),
        refetchVault()
      ])
    } catch (error) {
      console.error('Trade failed:', error)
      throw error
    }
  }

    const handleClosePosition = async (positionId: string, exitPrice?: number) => {
      if (!profile) return
      const position = activePositions.find(p => p.id === positionId)
      if (!position) return

      setClosingPosition(positionId)
      try {
        const finalPrice = exitPrice ?? currentPrice
        const result = await closePosition(positionId, finalPrice)
        
          // Log trade_closed
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

      
      // Refresh all related data
      await Promise.all([
        refresh(),
        refetchVault()
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
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
          <div className="flex items-center justify-between">
            <Link href={`/markets/${gameId}?sport=${searchParams.get('sport')}`} className="p-2 -ml-2 hover:bg-white/5 rounded-xl transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cash Balance</span>
                    <span className="text-xl font-black text-primary font-mono">${cashBalance.toFixed(2)}</span>
                  </div>
                </div>
          </div>

        {selectedProp ? (
          <>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-primary/20 bg-primary/5 shadow-2xl relative group">
                {selectedProp.photo_url ? (
                  <img src={selectedProp.photo_url} alt={selectedProp.player_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                    {selectedGame?.sport || 'NBA'}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-secondary text-[10px] font-black uppercase tracking-widest text-secondary-foreground">
                    {selectedProp.team}
                  </div>
                </div>
                <h1 className="text-3xl font-black text-white leading-tight truncate">
                  {selectedProp.player_name}
                </h1>
                {/* Removed repeating prop name here as it's visible in the chart and header */}
              </div>
            </div>

            <TradingChart 
              history={history} 
              currentValue={currentPrice}
              propType={PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}
              line={selectedProp.line || 0}
              lastUpdated={selectedProp.last_update}
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
              />


            {activePositions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="font-display font-black text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Positions</h2>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">LIVE</span>
                  </div>
                </div>
                
                <div className="relative rounded-[2.5rem] p-4 sm:p-6 overflow-hidden border border-blue-500/20 shadow-[0_0_50px_-12px_rgba(59,130,246,0.2)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.07] via-transparent to-purple-500/[0.07]" />
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
                  
                  <div className="relative space-y-4">
                    {activePositions.map((position) => (
                        <PositionCard
                          key={position.id}
                          position={position}
                          currentTemp={(position as any).current_price || currentPrice}
                          onClose={handleClosePosition}
                          onPriceCheck={handlePriceCheck}
                          loading={closingPosition === position.id}
                          isDark={true}
                          lastUpdated={(selectedProp as any).last_update}
                        />

                    ))}
                  </div>
                </div>
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
