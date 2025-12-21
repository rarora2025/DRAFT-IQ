'use client'

import { useState, useMemo } from 'react'
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
  playerName = 'Player',
  propType = 'Points',
}: TradingChartProps) {
  const [showStats, setShowStats] = useState(true)
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

    const distanceToLine = line - currentValue

    return {
      high,
      low,
      avg,
      volatility,
      momentum,
      distanceToLine,
    }
  }, [chartData, currentValue, line])

  const minValue = Math.min(...chartData.map((d) => d.value), line) * 0.9
  const maxValue = Math.max(...chartData.map((d) => d.value), line) * 1.1

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
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Live Projection</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-md transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              showStats
                ? 'bg-primary/20 text-primary'
                : isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2">
            <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider text-red-400/70">High</span>
              </div>
              <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                {stats.high.toFixed(1)}
              </span>
            </div>
            <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <TrendingDown className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wider text-blue-400/70">Low</span>
              </div>
              <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
                {stats.low.toFixed(1)}
              </span>
            </div>
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider text-yellow-500/70">Vol</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {stats.volatility.toFixed(1)}
            </span>
          </div>
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Target className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider text-primary/70">Line</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {line.toFixed(1)}
            </span>
          </div>
        </div>
      )}

        <div className={`w-full relative rounded-xl p-2 transition-all duration-300 ${isExpanded ? 'h-[400px]' : 'h-[200px]'} ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3de100" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3de100" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#27272a' : '#e5e7eb'}
              vertical={false}
            />
            <XAxis
              dataKey="index"
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#71717a' : '#9ca3af', fontSize: 10 }}
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
              tick={{ fill: isDark ? '#71717a' : '#9ca3af', fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(1)}`}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            <ReferenceLine
              y={line}
              stroke={isDark ? '#71717a' : '#9ca3af'}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="value"
              fill="url(#valueGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3de100"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#3de100',
                stroke: isDark ? '#020420' : '#ffffff',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] ${isDark ? 'text-primary' : 'text-primary'}`}>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-black">LIVE</span>
        </div>
      </div>

      {stats && (
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>Momentum</span>
            <span
              className={`font-mono ${
                stats.momentum > 0
                  ? 'text-primary'
                  : stats.momentum < 0
                  ? 'text-red-400'
                  : isDark ? 'text-zinc-500' : 'text-gray-500'
              }`}
            >
              {stats.momentum > 0 ? '+' : ''}
              {stats.momentum.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>To Line</span>
            <span
              className={`font-mono ${
                stats.distanceToLine > 0 ? 'text-primary' : 'text-red-400'
              }`}
            >
              {stats.distanceToLine > 0 ? '+' : ''}
              {stats.distanceToLine.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
