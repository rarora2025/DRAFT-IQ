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
    <div className={`rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl ${isDark ? 'bg-[#020420]/95 border border-white/10' : 'bg-white/95 border border-gray-200'}`}>
      <div className="flex flex-col gap-2">
        <p className={`text-[11px] font-mono font-black tracking-widest uppercase ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {new Date(data.time).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            timeZone: 'America/New_York' 
          })} EST
        </p>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black font-mono tracking-tighter ${value === null ? 'text-red-500' : 'text-primary'}`}>
            {value === null ? 'LOCKED' : value.toFixed(1)}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
    // Professional trading charts use a bit more padding on the y-axis
    const padding = range === 0 ? 5 : range * 0.4 
    
    return {
      minValue: Math.max(0, baseMin - (padding / 2)),
      maxValue: baseMax + padding
    }
  }, [processedData, line])

  const xAxisTicks = useMemo(() => {
    if (processedData.length === 0) return []
    if (processedData.length <= 5) return processedData.map((_, i) => i)
    const tickCount = 4
    const step = Math.floor((processedData.length - 1) / (tickCount - 1))
    const ticks = []
    for (let i = 0; i < tickCount - 1; i++) {
      ticks.push(i * step)
    }
    ticks.push(processedData.length - 1)
    return ticks
  }, [processedData.length])

  return (
    <div className="w-full space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'High', value: stats?.high.toFixed(1) || '0.0', icon: TrendingUp, color: 'text-primary' },
          { label: 'Low', value: stats?.low.toFixed(1) || '0.0', icon: TrendingDown, color: 'text-red-400' },
          { label: 'Vol', value: stats?.volatility.toFixed(1) || '0.0', icon: Activity, color: 'text-yellow-400' },
          { label: 'Line', value: line.toFixed(1), icon: Target, color: 'text-primary' }
        ].map((stat, i) => (
          <div key={i} className={`p-3 rounded-2xl border ${isDark ? 'bg-[#020420]/50 border-white/5' : 'bg-white border-gray-100'} flex flex-col items-center justify-center gap-1`}>
            <div className="flex items-center gap-1.5 opacity-60">
              <stat.icon className={`w-3 h-3 ${stat.color}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <span className="text-sm font-black font-mono tracking-tight">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className={`w-full relative rounded-2xl p-4 ${isDark ? 'bg-[#020420]/50 border border-white/5' : 'bg-white border border-gray-100'} h-[280px]`}>
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 20, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3de100" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                vertical={false}
              />
                <XAxis
                  dataKey="index"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#52525b' : '#9ca3af', fontSize: 10, fontWeight: 700 }}
                  ticks={xAxisTicks}
                  tickFormatter={(index) => {
                    const point = processedData[index]
                    if (!point) return ''
                    return new Date(point.time).toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'America/New_York' 
                    })
                  }}
                />

              <YAxis
                domain={[minValue, maxValue]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#52525b' : '#9ca3af', fontSize: 10, fontWeight: 600 }}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip 
                content={<CustomTooltip isDark={isDark} />} 
                cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', strokeWidth: 1 }}
              />
                <ReferenceLine
                  y={line}
                  stroke={isDark ? '#3de100' : '#3de100'}
                  strokeDasharray="3 3"
                  strokeOpacity={0.2}
                />
                
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
                  dot={false}
                  connectNulls={false}
                  activeDot={{
                    r: 6,
                    fill: '#3de100',
                    stroke: isDark ? '#020420' : '#ffffff',
                    strokeWidth: 2,
                  }}
                />
            </ComposedChart>
          </ResponsiveContainer>
        )}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {lastUpdated && (
              <div className={`px-2 py-0.5 rounded border ${isDark ? 'border-white/5 bg-white/5' : 'border-black/5 bg-black/5'} backdrop-blur-sm`}>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-tighter ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {new Date(lastUpdated).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    timeZone: 'America/New_York' 
                  })} EST
                </span>
              </div>
            )}
          </div>

      </div>
    </div>
  )
}

