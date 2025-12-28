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
  percentChange?: number
}

interface TradingChartProps {
  currentValue: number
  history: { time: string; value: number | null }[]
  line?: number
  isDark?: boolean
  playerName?: string
  propType?: string
  marketStatus?: string
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
  const percentChange = data.percentChange

  return (
    <div className={`rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl ${isDark ? 'bg-[#020420]/95 border border-white/10' : 'bg-white/95 border border-gray-200'}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-8">
            <p className={`text-[11px] font-mono font-black tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              {new Date(data.time).toLocaleTimeString('en-US', { 
                hour12: true, 
                hour: 'numeric', 
                minute: '2-digit'
              })}
            </p>
            <div className="flex items-center gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
               <span className="text-[8px] font-black text-primary uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono tracking-tighter ${value === null ? 'text-red-500' : 'text-primary'}`}>
              {value === null ? 'LOCKED' : value.toFixed(1)}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {propType?.toUpperCase() || 'PRICE'}
            </span>
          </div>
        {percentChange !== undefined && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
            <span className={`text-[11px] font-black font-mono ${percentChange >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {percentChange >= 0 ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
            </span>
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">vs Open</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function TradingChart({
  currentValue,
  history,
  line = 0,
  isDark = true,
  propType = 'Points',
  lastUpdated,
  marketStatus,
}: TradingChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [activePoint, setActivePoint] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const processedData = useMemo(() => {
    if (!history.length) return []
    
    const firstValidPoint = history.find(p => p.value !== null)
    const firstValue = firstValidPoint?.value || 0

    return history.map((point, index) => {
      const pChange = point.value !== null && firstValue !== 0 
        ? ((point.value - firstValue) / firstValue) * 100 
        : 0

      return {
        ...point,
        index,
        displayValue: point.value,
        isHole: point.value === null,
        percentChange: pChange
      }
    })
  }, [history])

  const trendStats = useMemo(() => {
    const validValues = processedData.filter(d => d.value !== null).map(d => d.value as number)
    if (validValues.length === 0) return null

    const high = Math.max(...validValues)
    const low = Math.min(...validValues)
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length
    
    // Calculate Trend Strength (0-100) based on momentum
    const recent = validValues.slice(-5)
    const old = validValues.slice(0, 5)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const oldAvg = old.reduce((a, b) => a + b, 0) / old.length
    const momentum = ((recentAvg - oldAvg) / oldAvg) * 100
    const strength = Math.min(100, Math.abs(momentum) * 10)

    // Volatility Index
    const returns = []
    for (let i = 1; i < validValues.length; i++) {
      returns.push(Math.abs((validValues[i] - validValues[i-1]) / validValues[i-1]))
    }
    const volIndex = returns.length > 0 
      ? (returns.reduce((a, b) => a + b, 0) / returns.length) * 1000
      : 0

    return { 
      high, 
      low, 
      avg, 
      volatility: volIndex.toFixed(1),
      strength: strength.toFixed(0),
      momentum: momentum >= 0 ? 'BULLISH' : 'BEARISH'
    }
  }, [processedData])

  const { minValue, maxValue } = useMemo(() => {
    const validValues = processedData.filter(d => d.value !== null).map(d => d.value as number)
    const baseMin = validValues.length > 0 ? Math.min(...validValues, line) : line
    const baseMax = validValues.length > 0 ? Math.max(...validValues, line) : line
    
    const range = baseMax - baseMin
    const padding = Math.max(2, range * 0.2) // Standardized 20% padding
    
    return {
      minValue: Math.floor(Math.max(0, baseMin - padding)),
      maxValue: Math.ceil(baseMax + padding)
    }
  }, [processedData, line])

  const xAxisTicks = useMemo(() => {
    if (processedData.length === 0) return []
    if (processedData.length <= 4) return processedData.map((_, i) => i)
    return [
      0, 
      Math.floor(processedData.length * 0.25),
      Math.floor(processedData.length * 0.5),
      Math.floor(processedData.length * 0.75),
      processedData.length - 1
    ]
  }, [processedData.length])

  const isLocked = useMemo(() => {
    // 1. Check explicit status
    if (['locked', 'inactive', 'FROZEN', 'SETTLED', 'LOCKED'].includes(marketStatus || '')) return true

    // 2. Check staleness
    if (!lastUpdated) return false
    const lastUpdateDate = new Date(lastUpdated)
    const diffMs = Date.now() - lastUpdateDate.getTime()
    
    // If live, 5 mins is stale
    if (marketStatus === 'LIVE') return diffMs > 5 * 60 * 1000
    
    // If pre-game, 60 mins is stale
    return diffMs > 60 * 60 * 1000
  }, [lastUpdated, marketStatus])

  const displayPrice = useMemo(() => {
    if (isLocked) return 'LOCKED'
    if (processedData.length > 0) {
      const lastPoint = processedData[processedData.length - 1]
      if (lastPoint?.value !== null) return lastPoint.value.toFixed(1)
    }
    return currentValue.toFixed(1)
  }, [currentValue, processedData, isLocked])

  return (
    <div className="w-full space-y-4">
      {/* Metrics Row - Redesigned to look like a separate object */}
        <div className="grid grid-cols-4 gap-2 bg-blue-900/10 p-3 rounded-[2rem] border border-white/5 shadow-inner">
          {[
            { label: 'VOLATILITY', value: trendStats?.volatility || '0.0', sub: 'Index' },
            { label: 'STRENGTH', value: (trendStats?.strength || '0') + '%', sub: trendStats?.momentum || 'STABLE' },
            { label: 'PEAK', value: trendStats?.high.toFixed(1) || '0.0', sub: 'High' },
            { label: 'FLOOR', value: trendStats?.low.toFixed(1) || '0.0', sub: 'Low' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{stat.label}</span>
              <span className="text-sm font-black font-mono text-white leading-none">{stat.value}</span>
              <span className={`text-[6px] font-black uppercase tracking-widest mt-1 ${
                stat.sub === 'BULLISH' || stat.sub === 'High' ? 'text-primary' : 
                stat.sub === 'BEARISH' || stat.sub === 'Low' ? 'text-red-500' : 
                'text-zinc-600'
              }`}>{stat.sub}</span>
            </div>
          ))}
        </div>

      <div className={`w-full relative rounded-[2.5rem] p-6 sm:p-8 bg-blue-900/10 overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -ml-32 -mb-32" />

        <div className="relative flex flex-col gap-6">
          {/* Header - Simplified, removed "Price History" / "Live Tracking" style words */}
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-red-500' : 'bg-primary'} animate-pulse shadow-[0_0_8px_rgba(61,225,0,0.4)]`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isLocked ? 'text-red-500' : 'text-primary'}`}>
                  {isLocked ? 'LOCKED' : 'LIVE'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-black font-mono tracking-tighter text-white">
                  {displayPrice}
                </h2>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{propType}</span>
              </div>
            </div>
            
            {trendStats && (
              <div className="text-right">
                <div className={`text-sm font-black font-mono ${parseFloat(trendStats.strength) > 0 ? 'text-primary' : 'text-red-500'}`}>
                  {trendStats.momentum === 'BULLISH' ? '▲' : '▼'}{trendStats.strength}%
                </div>
                <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Momentum</div>
              </div>
            )}
          </div>

          {/* Chart Area */}
          <div className="h-[280px] min-w-0 w-full relative">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={processedData} 
                  margin={{ top: 10, right: 60, left: 10, bottom: 40 }}
                  onMouseMove={(e) => e?.activePayload?.[0] && setActivePoint(e.activePayload[0].payload)}
                  onMouseLeave={() => setActivePoint(null)}
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3de100" stopOpacity={0.15} />
                      <stop offset="50%" stopColor="#3de100" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid 
                    strokeDasharray="0" 
                    stroke="rgba(255,255,255,0.02)" 
                    vertical={false} 
                  />

                  <XAxis
                    dataKey="index"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8, fontWeight: 800 }}
                    ticks={xAxisTicks}
                    tickFormatter={(index) => {
                      const point = processedData[index]
                      if (!point) return ''
                      return new Date(point.time).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      })
                    }}
                    dy={10}
                    interval={0}
                  />

                    <YAxis
                      domain={[minValue, maxValue]}
                      axisLine={false}
                      tickLine={false}
                      orientation="right"
                      tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 800 }}
                      tickFormatter={(val) => val.toFixed(1)}
                      width={55}
                    />

                  <Tooltip 
                    content={<CustomTooltip isDark={isDark} propType={propType} />} 
                    cursor={{ 
                      stroke: 'rgba(255, 255, 255, 0.1)', 
                      strokeWidth: 1,
                      strokeDasharray: '4 4'
                    }}
                  />

                  <ReferenceLine
                    y={line}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1}
                    label={{
                      value: 'OPEN',
                      position: 'right',
                      fill: 'rgba(255,255,255,0.15)',
                      fontSize: 7,
                      fontWeight: 900,
                      dx: -20,
                      dy: -10
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    fill="url(#chartGradient)"
                    stroke="none"
                    connectNulls={true}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3de100"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={true}
                    isAnimationActive={true}
                    animationDuration={1000}
                    filter="url(#glow)"
                    activeDot={{
                      r: 5,
                      fill: '#3de100',
                      stroke: '#020420',
                      strokeWidth: 2,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {/* Price Tag Overlay */}
            {activePoint && (
              <div 
                className="absolute right-0 pointer-events-none transition-all duration-75"
                style={{ 
                  top: `${((maxValue - activePoint.value) / (maxValue - minValue)) * 100}%`,
                  transform: 'translateY(-50%)'
                }}
              >
                <div className="bg-primary text-black font-mono font-black text-[9px] px-2 py-0.5 rounded-l-md shadow-lg mr-[-5px]">
                  {activePoint.value.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
