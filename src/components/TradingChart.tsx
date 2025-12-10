'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts'

interface ChartDataPoint {
  time: string
  temp: number
}

interface TradingChartProps {
  currentTemp: number
  history: ChartDataPoint[]
}

export function TradingChart({ currentTemp, history }: TradingChartProps) {
  const [animatedData, setAnimatedData] = useState<ChartDataPoint[]>([])
  
  useEffect(() => {
    setAnimatedData(history)
  }, [history])

  const minTemp = Math.min(...history.map(d => d.temp)) - 2
  const maxTemp = Math.max(...history.map(d => d.temp)) + 2
  const avgTemp = history.length > 0 ? history.reduce((sum, d) => sum + d.temp, 0) / history.length : currentTemp

  return (
    <div className="w-full h-[200px] relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#f97316]/5 to-[#3b82f6]/5 rounded-xl" />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={animatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#f97316" stopOpacity={0.05} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minTemp, maxTemp]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(value) => `${value}°`}
          />
          <ReferenceLine y={avgTemp} stroke="#475569" strokeDasharray="3 3" />
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
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
