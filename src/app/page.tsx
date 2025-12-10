'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { TradingChart } from '@/components/TradingChart'
import { TemperatureDisplay } from '@/components/TemperatureDisplay'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useProjection } from '@/hooks/useProjection'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'

const LEVERAGE = 10
const LIQUIDATION_THRESHOLD = -0.9

export default function TradingPage() {
  const { user, loading: authLoading } = useAuth()
  const { temperature, history, change, openingTemp, loading: projectionLoading } = useProjection()
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const { positions, openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const liquidatingRef = useRef<Set<string>>(new Set())

  const unrealizedPnl = useMemo(() => {
    return positions.reduce((total, pos) => {
      const diff = temperature - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long' 
        ? pos.size * LEVERAGE * percentChange 
        : -pos.size * LEVERAGE * percentChange
      return total + pnl
    }, 0)
  }, [positions, temperature])

  // Auto-liquidate positions that hit -90% loss
  useEffect(() => {
    if (!profile) return
    
    positions.forEach(async (pos) => {
      if (liquidatingRef.current.has(pos.id)) return
      
      const diff = temperature - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long' 
        ? pos.size * LEVERAGE * percentChange 
        : -pos.size * LEVERAGE * percentChange
      const pnlRatio = pnl / pos.size
      
      if (pnlRatio <= LIQUIDATION_THRESHOLD) {
        liquidatingRef.current.add(pos.id)
        const finalPnl = await closePosition(pos.id, temperature)
        if (finalPnl !== undefined) {
          const returnAmount = Math.max(0, pos.size + finalPnl)
          await updateBalance(profile.balance + returnAmount)
        }
        liquidatingRef.current.delete(pos.id)
      }
    })
  }, [positions, temperature, profile, closePosition, updateBalance])

  const totalValue = useMemo(() => {
    return (profile?.balance ?? 0) + unrealizedPnl
  }, [profile?.balance, unrealizedPnl])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!profile) return
    
    await openPosition(side, size, temperature)
    await updateBalance(profile.balance - size)
  }

  const handleClosePosition = async (positionId: string) => {
    if (!profile) return
    
    setClosingPosition(positionId)
    try {
      const position = positions.find(p => p.id === positionId)
      if (!position) return
      
      const pnl = await closePosition(positionId, temperature)
      if (pnl !== undefined) {
        const returnAmount = Math.max(0, position.size + pnl)
        await updateBalance(profile.balance + returnAmount)
      }
    } finally {
      setClosingPosition(null)
    }
  }

  if (authLoading || projectionLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-orange-500/10 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text text-transparent">
              Hot or Cold
            </h1>
            <p className="text-sm text-muted-foreground">NYC Weather Market</p>
          </div>
          <div className="glass rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="font-display font-bold">${profile?.balance.toFixed(2)}</span>
            </div>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="text-center mb-6">
            <TemperatureDisplay
              temperature={temperature}
              previousTemperature={openingTemp}
              change={change}
            />
          </div>

          <TradingChart currentTemp={temperature} history={history} />
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Unrealized P/L</div>
            <div className={`font-display font-bold text-lg flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Value</div>
            <div className="font-display font-bold text-lg text-foreground">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        <TradePanel
          balance={profile?.balance ?? 0}
          currentTemp={temperature}
          onTrade={handleTrade}
        />

        {positions.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg">Open Positions</h2>
            <AnimatePresence mode="popLayout">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  currentTemp={temperature}
                  onClose={handleClosePosition}
                  loading={closingPosition === position.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}