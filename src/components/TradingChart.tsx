'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Clock } from 'lucide-react'

interface ChartDataPoint {
  time: string
  value: number | null
  index: number
}

interface TradingChartProps {
  currentValue: number
  history: { time: string; value: number | null }[]
  line?: number
  isDark?: boolean
  playerName?: string
  propType?: string
  lastUpdated?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  isDark?: boolean
  propType?: string
}

function CustomTooltip({ active, payload, isDark = true, propType }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const value = data.value

  return (
    <div className={`rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl ${isDark ? 'bg-[#020420]/95 border border-white/10' : 'bg-white/95 border border-gray-200'}`}>
      <div className="flex flex-col gap-2">
        <p className={`text-[11px] font-mono font-black tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {new Date(data.time).toLocaleTimeString('en-US', { 
            hour12: true, 
            hour: 'numeric', 
            minute: '2-digit'
          })}
        </p>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black font-mono tracking-tighter ${value === null ? 'text-red-500' : 'text-primary'}`}>
            {value === null ? 'LOCKED' : value.toFixed(1)}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {propType === 'Points' ? 'PTS' : 'UNIT'}
          </span>
        </div>
      </div>
    </div>
  )
}

const TIME_RANGES = [
  { label: '15M', value: 15 * 60 * 1000 },
  { label: '1H', value: 60 * 60 * 1000 },
  { label: '4H', value: 4 * 60 * 60 * 1000 },
  { label: 'ALL', value: Infinity },
]

export function TradingChart({
  currentValue,
  history,
  line = 0,
  isDark = true,
  propType = 'Points',
  lastUpdated,
}: TradingChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [timeRange, setTimeRange] = useState(TIME_RANGES[3].value) // Default to ALL
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => setTick(t => t + 1), 5000) // Tick every 5s to update "now" point
    return () => clearInterval(interval)
  }, [])

  const filteredHistory = useMemo(() => {
    if (timeRange === Infinity) return history
    const now = Date.now()
    return history.filter(p => (now - new Date(p.time).getTime()) <= timeRange)
  }, [history, timeRange])

  const processedData = useMemo(() => {
    const now = new Date()
    const data = filteredHistory.map((point, index) => ({
      ...point,
      index,
      displayValue: point.value,
      isHole: point.value === null
    }))

    // Append a "now" point to ensure the graph extends to the current time
    // Only if we have some data and the market is not completed
    if (data.length > 0) {
      const lastPoint = data[data.length - 1]
      const lastPointTime = new Date(lastPoint.time).getTime()
      const nowMs = now.getTime()
      
      // If the last point is older than 5 seconds, append a "now" point
      if (nowMs - lastPointTime > 5000) {
        data.push({
          time: now.toISOString(),
          value: currentValue,
          index: data.length,
          displayValue: currentValue,
          isHole: false
        })
      }
    } else if (currentValue !== undefined) {
      // If no history, just show the current value as a single point at "now"
      data.push({
        time: now.toISOString(),
        value: currentValue,
        index: 0,
        displayValue: currentValue,
        isHole: false
      })
    }

    return data
  }, [filteredHistory, currentValue, tick])

  const stats = useMemo(() => {
    const validValues = processedData.filter(d => d.value !== null).map(d => d.value as number)
    if (validValues.length === 0) return null

    const high = Math.max(...validValues)
    const low = Math.min(...validValues)
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length
    
    const volatility = Math.sqrt(
      validValues.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / validValues.length
    )

    return { high, low, avg, volatility }
  }, [processedData])

  const { minValue, maxValue } = useMemo(() => {
    const validValues = processedData.filter(d => d.value !== null).map(d => d.value as number)
    const baseMin = validValues.length > 0 ? Math.min(...validValues, line) : line
    const baseMax = validValues.length > 0 ? Math.max(...validValues, line) : line
    
    const range = baseMax - baseMin
    const padding = range === 0 ? 5 : range * 0.3 
    
    return {
      minValue: Math.max(0, baseMin - padding),
      maxValue: baseMax + padding
    }
  }, [processedData, line])

  const xAxisTicks = useMemo(() => {
    if (processedData.length === 0) return []
    if (processedData.length <= 5) return processedData.map((_, i) => i)
    const tickCount = 5
    const step = Math.floor((processedData.length - 1) / (tickCount - 1))
    const ticks = []
    for (let i = 0; i < tickCount - 1; i++) {
      ticks.push(i * step)
    }
    ticks.push(processedData.length - 1)
    return ticks
  }, [processedData.length])

  const isLocked = useMemo(() => {
    if (!lastUpdated) return false
    const lastUpdateDate = new Date(lastUpdated)
    const now = new Date()
    const diffMs = now.getTime() - lastUpdateDate.getTime()
    // Consider stale if no update for > 5 minutes
    const isStale = diffMs > 5 * 60 * 1000
    
    const statusLocked = lastUpdated === 'locked' || lastUpdated === 'inactive' || lastUpdated === 'FROZEN' || lastUpdated === 'SETTLED' || lastUpdated === 'LOCKED'
    return isStale || statusLocked
  }, [lastUpdated])

  const displayPrice = useMemo(() => {
    if (isLocked) return 'LOCKED'
    
    // To ensure zero delay with the graph, we prefer the latest value from history
    // if it exists and matches the current value's general magnitude (to avoid jumps)
    if (processedData.length > 0) {
      const lastPoint = processedData[processedData.length - 1]
      if (lastPoint && lastPoint.value !== null) {
        return lastPoint.value.toFixed(1)
      }
    }
    
    return currentValue.toFixed(1)
  }, [currentValue, processedData, isLocked])

  return (
    <div className="w-full space-y-4">
      <div className={`w-full relative rounded-3xl p-6 ${isDark ? 'bg-card border border-border shadow-2xl' : 'bg-white border border-gray-200 shadow-sm'} flex flex-col gap-6`}>
        {/* Header Area */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Live Performance</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Live Syncing</span>
                </div>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setTimeRange(range.value)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${
                    timeRange === range.value
                      ? 'bg-primary text-black shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Large Price Display & Stats Grid */}
          <div className="flex flex-col sm:flex-row gap-6 items-end sm:items-center justify-between">
            <div className="flex flex-col gap-1">
              {!isLocked && <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Current Prediction</span>}
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-black font-mono tracking-tighter ${isLocked ? 'text-red-500' : 'text-primary'}`}>
                  {displayPrice}
                </span>
                {!isLocked && (
                  <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">
                    {propType === 'Points' ? 'Points' : propType}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
              {[
                { label: 'High', value: stats?.high.toFixed(1) || '0.0', icon: TrendingUp, color: 'text-primary' },
                { label: 'Low', value: stats?.low.toFixed(1) || '0.0', icon: TrendingDown, color: 'text-red-400' },
                { label: 'Vol', value: stats?.volatility.toFixed(1) || '0.0', icon: Activity, color: 'text-yellow-400' },
              ].map((stat, i) => (
                <div key={i} className={`px-4 py-2.5 rounded-2xl border ${isDark ? 'bg-[#020420]/30 border-white/5' : 'bg-gray-50 border-gray-100'} flex flex-col items-center justify-center gap-0.5 min-w-[70px]`}>
                  <div className="flex items-center gap-1 opacity-60">
                    <stat.icon className={`w-2.5 h-2.5 ${stat.color}`} />
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="text-xs font-black font-mono tracking-tight">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-[260px] min-w-0 w-full relative group">
          {isMounted && (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3de100" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#ffffff' : '#000000', fontSize: 10, fontWeight: 900, opacity: 0.3 }}
                  ticks={xAxisTicks}
                  tickFormatter={(index) => {
                    const point = processedData[index]
                    if (!point) return ''
                    return new Date(point.time).toLocaleTimeString('en-US', { 
                      hour12: true, 
                      hour: 'numeric', 
                      minute: '2-digit'
                    })
                  }}
                  dy={10}
                  interval={0}
                />

                <YAxis
                  domain={[minValue, maxValue]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#ffffff' : '#000000', fontSize: 10, fontWeight: 900, opacity: 0.3 }}
                  tickFormatter={(value) => value.toFixed(1)}
                  orientation="left"
                  dx={-5}
                  width={35}
                />
                <Tooltip 
                  content={<CustomTooltip isDark={isDark} propType={propType} />} 
                  cursor={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                />
                <ReferenceLine
                  y={line}
                  stroke="#3de100"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
                
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="url(#valueGradient)"
                  stroke="none"
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                />
                
                {/* Yellow Line for Locked/Interpolated segments */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#facc15"
                  strokeWidth={2}
                  strokeOpacity={0.4}
                  dot={false}
                  connectNulls={true}
                  activeDot={{
                    r: 5,
                    fill: '#facc15',
                    stroke: isDark ? '#020420' : '#ffffff',
                    strokeWidth: 2,
                  }}
                />

                {/* Main Price Line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3de100"
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={1000}
                  activeDot={{
                    r: 6,
                    fill: '#3de100',
                    stroke: isDark ? '#020420' : '#ffffff',
                    strokeWidth: 2,
                    className: "shadow-xl"
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
