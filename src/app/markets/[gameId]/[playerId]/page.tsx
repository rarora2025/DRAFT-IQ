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

  const { profile, positions, loading: vaultLoading, refetch: refetchVault } = useVault(user?.id)
  const { openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [isDark] = useState(true)

  const currentPrice = selectedProp?.current_value || selectedProp?.line || 0

  const activePositions = useMemo(() => {
    return positions.filter(p => p.player_prop_id === playerId)
  }, [positions, playerId])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!user || !selectedProp || !profile) return
    
    try {
      // Use the hook which now uses the atomic RPC (balance update is handled in DB)
      await openPosition(
        side,
        size,
        currentPrice, 
        selectedProp.id,
        `${selectedProp.player_name} - ${PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type}`
      )
      
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
    setClosingPosition(positionId)
    try {
      const finalPrice = exitPrice ?? currentPrice
      const result = await closePosition(positionId, finalPrice)
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
      if (!res.ok) return currentPrice
      const data = await res.json()
      return data.prop?.current_value || data.prop?.line || currentPrice
    } catch (error) {
      console.error('Price check failed:', error)
      return currentPrice
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
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-2xl">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm font-black text-white font-mono">${profile?.balance.toFixed(2)}</span>
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
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">
                  {PROP_NAMES[selectedProp.prop_type] || selectedProp.prop_type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            <TradingChart 
              history={history} 
              currentPrice={currentPrice}
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
                <div className="space-y-4">
                  {activePositions.map((position) => (
                    <PositionCard
                      key={position.id}
                      position={position}
                      currentTemp={currentPrice}
                      onClose={handleClosePosition}
                      onPriceCheck={handlePriceCheck}
                      loading={closingPosition === position.id}
                      isDark={true}
                    />
                  ))}
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
