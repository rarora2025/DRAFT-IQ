'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatDisplayProps {
  value: number
  previousValue: number
  change: number
  isDark?: boolean
  label?: string
  unit?: string
}

export function TemperatureDisplay({ value, previousValue, change, isDark = true, label = 'Projected Line', unit = '' }: StatDisplayProps) {
  const [displayValue, setDisplayValue] = useState(value)
  
  useEffect(() => {
    const start = displayValue
    const end = value
    const duration = 500
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(start + (end - start) * eased)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value])

  const isUp = change > 0
  const isDown = change < 0
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  const valueColor = isUp ? 'text-orange-500' : isDown ? 'text-blue-500' : (isDark ? 'text-zinc-100' : 'text-gray-900')

  return (
    <div className="flex flex-col items-center">
      <p className={`text-xs uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{label}</p>
      <div className="relative">
        <motion.div
          key={value}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-7xl md:text-8xl font-mono font-bold ${valueColor}`}
        >
          {displayValue.toFixed(1)}{unit}
        </motion.div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={change}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-full border ${
            isUp 
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
              : isDown 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : isDark ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
        >
          <TrendIcon className="w-4 h-4" />
          <span className="font-mono font-semibold">
            {change > 0 ? '+' : ''}{change.toFixed(2)}{unit}
          </span>
          <span className="text-xs opacity-70">since open</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
