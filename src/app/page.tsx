'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, MapPin, ChevronDown } from 'lucide-react'
import { TradingChart } from '@/components/TradingChart'
import { TemperatureDisplay } from '@/components/TemperatureDisplay'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useWeatherData } from '@/hooks/useWeatherData'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'
import { CITIES } from '@/lib/cities'

const LEVERAGE = 10
const LIQUIDATION_THRESHOLD = -0.9

export default function TradingPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    city,
    cities,
    temperature,
    dailyHigh,
    dailyLow,
    projectedHigh,
    forecastHigh,
    history,
    loading: weatherLoading,
    changeCity,
  } = useWeatherData('nyc')
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const { positions, openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const liquidatingRef = useRef<Set<string>>(new Set())

  const openingProjection = history.length > 0 ? history[0].temp : projectedHigh
  const change = projectedHigh - openingProjection

  const unrealizedPnl = useMemo(() => {
    return positions.reduce((total, pos) => {
      const diff = projectedHigh - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * LEVERAGE * percentChange
        : -pos.size * LEVERAGE * percentChange
      return total + pnl
    }, 0)
  }, [positions, projectedHigh])

  useEffect(() => {
    if (!profile) return

    positions.forEach(async (pos) => {
      if (liquidatingRef.current.has(pos.id)) return

      const diff = projectedHigh - pos.entry_price
      const percentChange = diff / pos.entry_price
      const pnl = pos.side === 'long'
        ? pos.size * LEVERAGE * percentChange
        : -pos.size * LEVERAGE * percentChange
      const pnlRatio = pnl / pos.size

      if (pnlRatio <= LIQUIDATION_THRESHOLD) {
        liquidatingRef.current.add(pos.id)
        const finalPnl = await closePosition(pos.id, projectedHigh)
        if (finalPnl !== undefined) {
          const returnAmount = Math.max(0, pos.size + finalPnl)
          await updateBalance(profile.balance + returnAmount)
        }
        liquidatingRef.current.delete(pos.id)
      }
    })
  }, [positions, projectedHigh, profile, closePosition, updateBalance])

  const totalValue = useMemo(() => {
    return (profile?.balance ?? 0) + unrealizedPnl
  }, [profile?.balance, unrealizedPnl])

  const handleTrade = async (side: 'long' | 'short', size: number) => {
    if (!profile) return

    await openPosition(side, size, projectedHigh)
    await updateBalance(profile.balance - size)
  }

  const handleClosePosition = async (positionId: string) => {
    if (!profile) return

    setClosingPosition(positionId)
    try {
      const position = positions.find(p => p.id === positionId)
      if (!position) return

      const pnl = await closePosition(positionId, projectedHigh)
      if (pnl !== undefined) {
        const returnAmount = Math.max(0, position.size + pnl)
        await updateBalance(profile.balance + returnAmount)
      }
    } finally {
      setClosingPosition(null)
    }
  }

  if (authLoading || weatherLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-zinc-500 text-sm">Loading market data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl">
              <span className="text-orange-500">Hot</span>
              <span className="text-zinc-400"> or </span>
              <span className="text-blue-500">Cold</span>
            </h1>
            <p className="text-sm text-zinc-500">Columbia 2025 Game</p>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-zinc-100">${profile?.balance.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-zinc-500 text-center">Virtual Coins</p>
          </div>
        </header>

        <div className="relative">
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            className="w-full bg-[#111116] border border-[#27272a] rounded-xl px-4 py-3 flex items-center justify-between hover:border-emerald-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-zinc-200">{city.name}</p>
                <p className="text-xs text-zinc-500">Trading Market</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${showCityPicker ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showCityPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#111116] border border-[#27272a] rounded-xl overflow-hidden z-20"
              >
                {cities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      changeCity(c.id)
                      setShowCityPicker(false)
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1c1c24] transition-colors ${
                      c.id === city.id ? 'bg-emerald-500/10' : ''
                    }`}
                  >
                    <span className="font-mono text-xs text-zinc-500 w-8">{c.shortName}</span>
                    <span className={`font-medium ${c.id === city.id ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {c.name}
                    </span>
                    {c.id === city.id && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111116] border border-[#27272a] rounded-2xl p-6"
        >
          <div className="text-center mb-6">
            <TemperatureDisplay
              temperature={projectedHigh}
              previousTemperature={openingProjection}
              change={change}
            />
          </div>

          <TradingChart
            currentTemp={projectedHigh}
            history={history}
            dailyHigh={dailyHigh}
            dailyLow={dailyLow}
            projectedHigh={projectedHigh}
          />
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111116] border border-[#27272a] rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Unrealized P/L</div>
            <div className={`font-mono font-bold text-lg flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Total Value</div>
            <div className="font-mono font-bold text-lg text-zinc-100">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        <TradePanel
          balance={profile?.balance ?? 0}
          currentTemp={projectedHigh}
          onTrade={handleTrade}
        />

        {positions.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-lg text-zinc-200">Open Positions</h2>
            <AnimatePresence mode="popLayout">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  currentTemp={projectedHigh}
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