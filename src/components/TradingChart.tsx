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
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: ChartDataPoint }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-[#111116] border border-[#27272a] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{payload[0].payload.time}</p>
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
    const progressToHigh = ((currentTemp - dailyLow) / (dailyHigh - dailyLow)) * 100

    return {
      high,
      low,
      avg,
      range,
      volatility,
      momentum,
      distanceToProjected,
      progressToHigh: Math.min(100, Math.max(0, progressToHigh)),
    }
  }, [chartData, currentTemp, dailyHigh, dailyLow, projectedHigh])

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
          <span className="text-sm font-medium text-zinc-300">Price Chart</span>
        </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            showStats
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
          }`}
        >
          {showStats ? 'Hide Stats' : 'Show Stats'}
        </button>
      </div>

      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[#111116] border border-[#27272a] rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">High</span>
            </div>
            <span className="font-mono text-sm font-bold text-zinc-200">
              {stats.high.toFixed(1)}°
            </span>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <TrendingDown className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Low</span>
            </div>
            <span className="font-mono text-sm font-bold text-zinc-200">
              {stats.low.toFixed(1)}°
            </span>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Activity className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Vol</span>
            </div>
            <span className="font-mono text-sm font-bold text-zinc-200">
              {stats.volatility.toFixed(2)}
            </span>
          </div>
          <div className="bg-[#111116] border border-[#27272a] rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <Target className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider">Proj</span>
            </div>
            <span className="font-mono text-sm font-bold text-zinc-200">
              {projectedHigh.toFixed(0)}°
            </span>
          </div>
        </div>
      )}

      {showStats && stats && (
        <div className="bg-[#111116] border border-[#27272a] rounded-lg p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400">Progress to Daily High</span>
            <span className="font-mono text-emerald-400">
              {stats.progressToHigh.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-red-500 transition-all duration-500"
              style={{ width: `${stats.progressToHigh}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-zinc-500 font-mono">
            <span>{dailyLow.toFixed(0)}°F</span>
            <span>{dailyHigh.toFixed(0)}°F</span>
          </div>
        </div>
      )}

      <div className="w-full h-[200px] relative bg-[#111116] border border-[#27272a] rounded-xl p-2">
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
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              ticks={xAxisTicks}
              tickFormatter={(index) => chartData[index]?.time || ''}
            />
            <YAxis
              domain={[minTemp, maxTemp]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              tickFormatter={(value) => `${value.toFixed(0)}°`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={stats?.avg}
              stroke="#71717a"
              strokeDasharray="3 3"
              label={{
                value: 'AVG',
                fill: '#71717a',
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
                stroke: '#0a0a0f',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-zinc-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>

      {stats && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Momentum:</span>
            <span
              className={`font-mono font-medium ${
                stats.momentum > 0
                  ? 'text-emerald-400'
                  : stats.momentum < 0
                  ? 'text-red-400'
                  : 'text-zinc-400'
              }`}
            >
              {stats.momentum > 0 ? '+' : ''}
              {stats.momentum.toFixed(3)}°/tick
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">To Target:</span>
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