'use client'

import { useState, useMemo } from 'react'
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Tooltip,
  CartesianGrid,
  Line
} from 'recharts'
import { TrendingUp, BarChart3 } from 'lucide-react'

interface ChartDataPoint {
  time: string
  value: number
  index: number
}

interface TradingChartProps {
  currentValue: number
  history: { time: string; value: number }[]
  line?: number
  isDark?: boolean
  playerName?: string
  propType?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: ChartDataPoint }[]
  isDark?: boolean
}

function CustomTooltip({ active, payload, isDark = true }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className={`rounded-lg px-3 py-2 shadow-xl ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
        {new Date(payload[0].payload.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="font-mono font-bold text-primary">
        {payload[0].value.toFixed(2)}
      </p>
    </div>
  )
}

export function TradingChart({
  currentValue,
  history,
  line = 0,
  isDark = true,
}: TradingChartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const chartData = useMemo(() => {
    return history.map((point, index) => ({
      ...point,
      index,
    }))
  }, [history])

  const stats = useMemo(() => {
    if (chartData.length === 0) return null

    const values = chartData.map((d) => d.value)
    const high = Math.max(...values)
    const low = Math.min(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    const volatility = Math.sqrt(
      values.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / values.length
    )

    const momentum =
      chartData.length > 5
        ? (values[values.length - 1] - values[values.length - 6]) / 5
        : 0

    return {
      high,
      low,
      avg,
      volatility,
      momentum,
    }
  }, [chartData])

  const minValue = Math.min(...chartData.map((d) => d.value), line) * 0.95
  const maxValue = Math.max(...chartData.map((d) => d.value), line) * 1.05

  const xAxisTicks = useMemo(() => {
    if (chartData.length <= 5) return chartData.map((_, i) => i)
    const tickCount = 5
    const step = Math.floor((chartData.length - 1) / (tickCount - 1))
    const ticks = []
    for (let i = 0; i < tickCount - 1; i++) {
      ticks.push(i * step)
    }
    ticks.push(chartData.length - 1)
    return ticks
  }, [chartData.length])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Live Trends</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold uppercase tracking-widest transition-all ${
            isExpanded
              ? 'bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20'
              : 'bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/50'
          }`}
        >
          {isExpanded ? 'Minimize' : 'Expand View'}
        </button>
      </div>

      <div className={`w-full relative rounded-2xl p-4 transition-all duration-500 overflow-hidden ${isDark ? 'bg-[#05060f] border border-border shadow-2xl' : 'bg-gray-50 border border-gray-200'} ${isExpanded ? 'h-[400px]' : 'h-[220px]'}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3de100" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 4"
              stroke={isDark ? '#1a1a24' : '#e5e7eb'}
              vertical={false}
            />
            <XAxis
              dataKey="index"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#4a4a5a' : '#9ca3af', fontSize: 9, fontWeight: 700 }}
              ticks={xAxisTicks}
              tickFormatter={(index) => {
                const point = chartData[index]
                if (!point) return ''
                return new Date(point.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              }}
            />
            <YAxis
              domain={[minValue, maxValue]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#4a4a5a' : '#9ca3af', fontSize: 9, fontWeight: 700 }}
              tickFormatter={(value) => `${value.toFixed(1)}`}
            />
            <Tooltip 
              content={<CustomTooltip isDark={isDark} />} 
              cursor={{ stroke: '#3de100', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <ReferenceLine
              y={line}
              stroke="#666"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="value"
              fill="url(#valueGradient)"
              stroke="none"
              animationDuration={1500}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3de100"
              strokeWidth={3}
              dot={false}
              animationDuration={1500}
              activeDot={{
                r: 6,
                fill: '#3de100',
                stroke: isDark ? '#05060f' : '#ffffff',
                strokeWidth: 2,
                className: "animate-pulse"
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-3 h-3 ${stats.momentum >= 0 ? 'text-primary' : 'text-red-400'}`} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Momentum</span>
            </div>
            <span
              className={`font-mono font-black text-xs ${
                stats.momentum > 0 ? 'text-primary' : stats.momentum < 0 ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              {stats.momentum > 0 ? '+' : ''}{stats.momentum.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Volatility</span>
            <span className="font-mono font-black text-xs text-white">
              {stats.volatility.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
