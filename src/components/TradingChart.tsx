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
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Maximize2, Minimize2 } from 'lucide-react'
import { InfoTooltip } from './InfoTooltip'

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
}

function CustomTooltip({ active, payload, isDark = true }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  const value = data.value

  return (
    <div className={`rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md ${isDark ? 'bg-[#020420]/90 border border-white/20' : 'bg-white/90 border border-gray-200'}`}>
      <div className="flex flex-col gap-1">
        <p className={`text-[10px] font-mono font-bold tracking-tight ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          {new Date(data.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-black font-mono ${value === null ? 'text-red-500' : 'text-primary'}`}>
            {value === null ? 'LOCKED' : value.toFixed(2)}
          </span>
          <span className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            PTS
          </span>
        </div>
      </div>
    </div>
  )
}

function CustomDot(props: any) {
  const { cx, cy, payload, isDark, isDotted } = props
  
  // If this is the main line and the value is null, Recharts won't even call this
  // If this is the dotted line (connectNulls=true), Recharts will call this with interpolated cy
  if (payload.value === null) {
    if (!isDotted) return null
    return (
      <g>
        <circle 
          cx={cx} 
          cy={cy} 
          r={3.5} 
          fill={isDark ? '#020420' : '#ffffff'} 
          stroke={isDark ? '#3f3f46' : '#d4d4d8'} 
          strokeWidth={1}
        />
        <circle 
          cx={cx} 
          cy={cy} 
          r={1.5} 
          fill={isDark ? '#71717a' : '#a1a1aa'} 
        />
      </g>
    )
  }

  if (isDotted) return null

  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      fill={isDark ? '#020420' : '#ffffff'} 
      stroke="#3de100" 
      strokeWidth={2} 
    />
  )
}

export function TradingChart({
  currentValue,
  history,
  line = 0,
  isDark = true,
  playerName = 'Player',
  propType = 'Points',
  lastUpdated,
}: TradingChartProps) {
  const [showStats, setShowStats] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const processedData = useMemo(() => {
    return history.map((point, index) => ({
      ...point,
      index,
      // For the dotted line, we use a connected version
      // For the hole markers, we add a specific field
      displayValue: point.value,
      isHole: point.value === null
    }))
  }, [history])

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
    const padding = range === 0 ? 2 : range * 0.2
    
    return {
      minValue: Math.max(0, baseMin - padding),
      maxValue: baseMax + padding
    }
  }, [processedData, line])

  const xAxisTicks = useMemo(() => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className={`text-sm font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>Market Projection</span>
            <div className={`text-[10px] font-mono font-bold ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
              {playerName} • {propType}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              isDark ? 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 uppercase tracking-widest ${
              showStats
                ? 'bg-primary text-black'
                : isDark ? 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            {showStats ? 'Stats On' : 'Stats Off'}
          </button>
        </div>
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'High', value: stats.high, color: 'text-emerald-400', bg: 'bg-emerald-400/5', icon: TrendingUp },
            { label: 'Low', value: stats.low, color: 'text-rose-400', bg: 'bg-rose-400/5', icon: TrendingDown },
            { label: 'Vol', value: stats.volatility, color: 'text-amber-400', bg: 'bg-amber-400/5', icon: Activity },
            { label: 'Line', value: line, color: 'text-primary', bg: 'bg-primary/5', icon: Target },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl p-2.5 flex flex-col items-center justify-center border transition-all hover:border-white/20 ${isDark ? 'bg-[#050725] border-white/5' : 'bg-gray-50 border-gray-200'} ${stat.bg}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${stat.color}`}>
                <stat.icon className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{stat.label}</span>
              </div>
              <span className={`font-mono text-sm font-black ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                {stat.value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={`w-full relative rounded-2xl p-4 transition-all duration-500 ease-in-out group ${isExpanded ? 'h-[450px]' : 'h-[250px]'} ${isDark ? 'bg-[#020420] border border-white/10 shadow-[0_0_50px_-12px_rgba(61,225,0,0.12)]' : 'bg-white border border-gray-200 shadow-xl'}`}>
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3de100" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="1 4"
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                vertical={true}
              />
              <XAxis
                dataKey="index"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#71717a' : '#9ca3af', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}
                ticks={xAxisTicks}
                tickFormatter={(index) => {
                  const point = processedData[index]
                  if (!point) return ''
                  return new Date(point.time).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                }}
              />
              <YAxis
                domain={[minValue, maxValue]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#71717a' : '#9ca3af', fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip 
                content={<CustomTooltip isDark={isDark} />} 
                cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
              />
              <ReferenceLine
                y={line}
                stroke={isDark ? '#3de100' : '#3de100'}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
                label={{ 
                  position: 'right', 
                  value: 'LINE', 
                  fill: '#3de100', 
                  fontSize: 10, 
                  fontWeight: 900, 
                  fontFamily: 'monospace',
                  opacity: 0.5
                }}
              />
              
              {/* Connected dotted line for gaps */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3de100"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                connectNulls={true}
                dot={<CustomDot isDark={isDark} isDotted={true} />}
                activeDot={false}
                animationDuration={1000}
              />

              {/* Solid line for segments */}
              <Area
                type="monotone"
                dataKey="value"
                fill="url(#valueGradient)"
                stroke="none"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3de100"
                strokeWidth={3}
                dot={<CustomDot isDark={isDark} />}
                connectNulls={false}
                activeDot={{
                  r: 6,
                  fill: '#3de100',
                  stroke: isDark ? '#020420' : '#ffffff',
                  strokeWidth: 2,
                  filter: 'url(#glow)'
                }}
                animationDuration={1000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#3de100]" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">LIVE FEED</span>
          </div>
          {lastUpdated && (
            <div className={`px-2 py-0.5 rounded border border-white/5 bg-white/5 backdrop-blur-sm`}>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-tighter ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                {new Date(lastUpdated).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

