'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, X, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Position } from '@/lib/types'

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
      ? position.size * percentChange 
      : -position.size * percentChange
    const pnlPercent = (pnl / position.size) * 100
    const isProfit = pnl >= 0

    const Icon = position.side === 'long' ? ArrowUpCircle : ArrowDownCircle
    const sideColor = position.side === 'long' ? 'text-primary' : 'text-red-400'
    const sideBg = position.side === 'long' ? 'bg-primary/10' : 'bg-red-500/10'

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className={`rounded-2xl p-5 relative overflow-hidden group ${isDark ? 'bg-card border border-border hover:border-primary/20' : 'bg-white border border-gray-200 shadow-sm'}`}
      >
        <div className={`absolute inset-0 ${sideBg} opacity-20 group-hover:opacity-30 transition-opacity`} />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${sideBg} ${sideColor} ${position.side === 'long' ? 'border-primary/20' : 'border-red-500/20'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-display font-black text-xs uppercase tracking-widest ${sideColor}`}>
                  {position.side === 'long' ? 'HIGHER' : 'LOWER'}
                </span>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ${position.size.toFixed(0)} Position
                </span>
              </div>
                <div className={`text-xs font-mono ${isDark ? 'text-muted-foreground' : 'text-gray-400'}`}>
                  Entry: {position.entry_price.toFixed(2)}
                </div>

            </div>
          </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className={`flex items-center gap-1 font-mono font-black text-lg ${isProfit ? 'text-primary' : 'text-red-400'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isProfit ? '+' : ''}{pnl.toFixed(2)}
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isProfit ? 'text-primary/70' : 'text-red-400/70'}`}>
              {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(position.id)}
            disabled={loading}
            className="h-10 w-10 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all border border-destructive/20"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}