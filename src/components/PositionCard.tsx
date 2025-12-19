'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, X, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Position } from '@/lib/types'

const LEVERAGE = 100

interface PositionCardProps {
  position: Position
  currentTemp: number
  onClose: (positionId: string) => Promise<void>
  loading?: boolean
  isDark?: boolean
}

export function PositionCard({ position, currentTemp, onClose, loading, isDark = true }: PositionCardProps) {
  const priceDiff = currentTemp - position.entry_price
  const percentChange = priceDiff / position.entry_price
  const pnl = position.side === 'long' 
    ? position.size * LEVERAGE * percentChange 
    : -position.size * LEVERAGE * percentChange
  const pnlPercent = (pnl / position.size) * 100
  const isProfit = pnl >= 0

  const Icon = position.side === 'long' ? ArrowUpCircle : ArrowDownCircle
  const sideColor = position.side === 'long' ? 'text-orange-400' : 'text-blue-400'
  const sideBg = position.side === 'long' ? 'bg-orange-500/10' : 'bg-blue-500/10'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`rounded-xl p-4 relative overflow-hidden ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}
    >
      <div className={`absolute inset-0 ${sideBg} opacity-30`} />
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${sideBg} ${sideColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-display font-bold ${sideColor}`}>
                {position.side === 'long' ? 'HIGH' : 'LOW'}
              </span>
              <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                ${position.size.toFixed(0)}
              </span>
            </div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                Entry: {position.entry_price.toFixed(2)}
              </div>

          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`flex items-center gap-1 font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isProfit ? '+' : ''}{pnl.toFixed(2)}
            </div>
            <div className={`text-xs font-mono ${isProfit ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(position.id)}
            disabled={loading}
            className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}