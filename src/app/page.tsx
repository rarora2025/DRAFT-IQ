'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Loader2, MapPin, ChevronDown, Search, Sun, Moon } from 'lucide-react'
import { TradingChart } from '@/components/TradingChart'
import { TemperatureDisplay } from '@/components/TemperatureDisplay'
import { TradePanel } from '@/components/TradePanel'
import { PositionCard } from '@/components/PositionCard'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useWeatherData } from '@/hooks/useWeatherData'
import { useProfile } from '@/hooks/useProfile'
import { usePositions } from '@/hooks/usePositions'
import { useTheme } from '@/hooks/useTheme'
import Image from 'next/image'

const LEVERAGE = 100
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
    searchCity,
  } = useWeatherData('nyc')
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const { positions, openPosition, closePosition } = usePositions(user?.id)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [citySearch, setCitySearch] = useState('')
  const liquidatingRef = useRef<Set<string>>(new Set())
  const { theme, toggleTheme } = useTheme()

  const openingProjection = history.length > 0 ? history[0].temp : projectedHigh
  const change = projectedHigh - openingProjection

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return cities
    const search = citySearch.toLowerCase()
    return cities.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.shortName.toLowerCase().includes(search)
    )
  }, [cities, citySearch])

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

  const handleCitySearch = async (query: string) => {
    setCitySearch(query)
    if (query.length >= 2) {
      await searchCity(query)
    }
  }

  const isDark = theme === 'dark'

  if (authLoading || weatherLoading || profileLoading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Loading market data...</p>
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
              <span className="text-orange-500">Hot</span>
              <span className={isDark ? 'text-zinc-400' : 'text-gray-400'}> or </span>
              <span className="text-blue-500">Cold</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>2025 Game</p>
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
              <p className={`text-[10px] text-center ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Virtual Coins</p>
            </div>
          </div>
        </header>

        <div className="relative">
          <button
            onClick={() => setShowCityPicker(!showCityPicker)}
            className={`w-full rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${isDark ? 'bg-[#111116] border border-[#27272a] hover:border-emerald-500/30' : 'bg-white border border-gray-200 hover:border-emerald-500/50 shadow-sm'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>{city.name}</p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Trading Market</p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${isDark ? 'text-zinc-400' : 'text-gray-400'} ${showCityPicker ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showCityPicker && (
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
                      placeholder="Search any city..."
                      value={citySearch}
                      onChange={(e) => handleCitySearch(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#0a0a0f] border border-[#27272a] text-zinc-200 placeholder:text-zinc-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400'} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredCities.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        changeCity(c.id)
                        setShowCityPicker(false)
                        setCitySearch('')
                      }}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-[#1c1c24]' : 'hover:bg-gray-50'} ${
                        c.id === city.id ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : ''
                      }`}
                    >
                      <span className={`font-mono text-xs w-8 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{c.shortName}</span>
                      <span className={`font-medium ${c.id === city.id ? 'text-emerald-400' : (isDark ? 'text-zinc-300' : 'text-gray-700')}`}>
                        {c.name}
                      </span>
                      {c.id === city.id && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                      No cities found. Try a different search.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
        >
          <div className="text-center mb-6">
            <TemperatureDisplay
              temperature={projectedHigh}
              previousTemperature={openingProjection}
              change={change}
              isDark={isDark}
            />
          </div>

          <TradingChart
            currentTemp={projectedHigh}
            history={history}
            dailyHigh={dailyHigh}
            dailyLow={dailyLow}
            projectedHigh={projectedHigh}
            isDark={isDark}
          />
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Unrealized P/L</div>
            <div className={`font-mono font-bold text-lg flex items-center gap-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
            </div>
          </div>
          <div className={`rounded-xl p-4 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <div className={`text-sm mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Total Value</div>
            <div className={`font-mono font-bold text-lg ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        <TradePanel
          balance={profile?.balance ?? 0}
          currentTemp={projectedHigh}
          onTrade={handleTrade}
          isDark={isDark}
        />

        {positions.length > 0 && (
          <div className="space-y-3">
            <h2 className={`font-display font-semibold text-lg ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>Open Positions</h2>
            <AnimatePresence mode="popLayout">
              {positions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  currentTemp={projectedHigh}
                  onClose={handleClosePosition}
                  loading={closingPosition === position.id}
                  isDark={isDark}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className={`flex items-center justify-center gap-2 pt-4 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          <span className="text-xs">Sponsored by</span>
          <Image
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Kalshi_logo.svg-1765479859194.png?width=8000&height=8000&resize=contain"
            alt="Kalshi"
            width={60}
            height={20}
            className="object-contain"
          />
        </div>
      </div>

      <Navbar isDark={isDark} />
    </div>
  )
}