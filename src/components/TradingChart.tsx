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
import { TrendingUp, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react'

interface ChartDataPoint {
  time: string
  temp: number
  index: number
}

interface TradingChartProps {
  currentTemp: number
  history: { time: string; temp: number }[]
  dailyHigh?: number
  dailyLow?: number
  projectedHigh?: number
  isDark?: boolean
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
      <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{payload[0].payload.time}</p>
      <p className="font-mono font-bold text-emerald-400">
        {payload[0].value.toFixed(2)}°F
      </p>
    </div>
  )
}

export function TradingChart({
  currentTemp,
  history,
  dailyHigh = 55,
  dailyLow = 45,
  projectedHigh = 55,
  isDark = true,
}: TradingChartProps) {
  const [showStats, setShowStats] = useState(true)

  const chartData = useMemo(() => {
    return history.map((point, index) => ({
      ...point,
      index,
    }))
  }, [history])

  const stats = useMemo(() => {
    if (chartData.length === 0) return null

    const temps = chartData.map((d) => d.temp)
    const high = Math.max(...temps)
    const low = Math.min(...temps)
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length
    const range = high - low

    const volatility = Math.sqrt(
      temps.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / temps.length
    )

    const momentum =
      chartData.length > 5
        ? (temps[temps.length - 1] - temps[temps.length - 6]) / 5
        : 0

    const distanceToProjected = projectedHigh - currentTemp

    return {
      high,
      low,
      avg,
      range,
      volatility,
      momentum,
      distanceToProjected,
    }
  }, [chartData, currentTemp, projectedHigh])

  const minTemp = Math.min(...chartData.map((d) => d.temp), dailyLow) - 2
  const maxTemp = Math.max(...chartData.map((d) => d.temp), dailyHigh) + 2

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
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>Price Chart</span>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>(updates every 5s, hourly ticks shown after 1hr)</span>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            showStats
              ? 'bg-emerald-500/20 text-emerald-400'
              : isDark ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-300' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">High</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {stats.high.toFixed(1)}°
            </span>
          </div>
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <TrendingDown className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Low</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {stats.low.toFixed(1)}°
            </span>
          </div>
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Vol</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {stats.volatility.toFixed(2)}
            </span>
          </div>
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <Target className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Proj</span>
            </div>
            <span className={`font-mono text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-gray-900'}`}>
              {projectedHigh.toFixed(0)}°
            </span>
          </div>
        </div>
      )}

      <div className={`w-full h-[200px] relative rounded-xl p-2 ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-gray-50 border border-gray-200'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#ef4444" />
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
              tickFormatter={(index) => chartData[index]?.time || ''}
            />
            <YAxis
              domain={[minTemp, maxTemp]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: isDark ? '#71717a' : '#9ca3af', fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(0)}°`}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            <ReferenceLine
              y={stats?.avg}
              stroke={isDark ? '#71717a' : '#9ca3af'}
              strokeDasharray="3 3"
              label={{
                value: 'AVG',
                fill: isDark ? '#71717a' : '#9ca3af',
                fontSize: 10,
                position: 'right',
              }}
            />
            <ReferenceLine
              y={projectedHigh}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="temp"
              fill="url(#tempGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="temp"
              stroke="url(#lineGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#10b981',
                stroke: isDark ? '#0a0a0f' : '#ffffff',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className={`absolute top-2 right-2 flex items-center gap-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {stats && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>Momentum:</span>
            <span
              className={`font-mono font-medium ${
                stats.momentum > 0
                  ? 'text-emerald-400'
                  : stats.momentum < 0
                  ? 'text-red-400'
                  : isDark ? 'text-zinc-400' : 'text-gray-500'
              }`}
            >
              {stats.momentum > 0 ? '+' : ''}
              {stats.momentum.toFixed(3)}°/tick
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>To Target:</span>
            <span
              className={`font-mono font-medium ${
                stats.distanceToProjected > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.distanceToProjected > 0 ? '+' : ''}
              {stats.distanceToProjected.toFixed(1)}°
            </span>
          </div>
        </div>
      )}
    </div>
  )
}