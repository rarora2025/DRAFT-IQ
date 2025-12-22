'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Position } from '@/lib/types'

interface PositionCardProps {
  position: Position
  currentTemp: number
  onClose: (positionId: string, exitPrice: number) => Promise<void>
  onPriceCheck?: () => Promise<number>
  loading?: boolean
  isDark?: boolean
}

export function PositionCard({ position, currentTemp, onClose, onPriceCheck, loading: externalLoading, isDark = true }: PositionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkingPrice, setCheckingPrice] = useState(false)
  const [freshPrice, setFreshPrice] = useState<number | null>(null)

  const displayPrice = freshPrice ?? currentTemp
  const priceDiff = displayPrice - position.entry_price
  const percentChange = priceDiff / position.entry_price
  const pnlPercent = (position.side === 'long' ? percentChange : -percentChange) * 100
  const isProfit = pnlPercent >= 0

  const handleInitialClick = async () => {
    if (onPriceCheck) {
      setCheckingPrice(true)
      try {
        const live = await onPriceCheck()
        setFreshPrice(live)
      } finally {
        setCheckingPrice(false)
      }
    }
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    await onClose(position.id, displayPrice)
    setShowConfirm(false)
  }

  const sideColor = position.side === 'long' ? 'text-orange-500' : 'text-blue-500'
  const sideBg = position.side === 'long' ? 'bg-orange-500/10' : 'bg-blue-500/10'
  const sideBorder = position.side === 'long' ? 'border-orange-500/20' : 'border-blue-500/20'
  
  const playerName = position.market_title?.includes(' - ') 
    ? position.market_title.split(' - ')[0] 
    : (position.market_title || 'NBA Player')
  
  const propName = position.market_title?.includes(' - ') 
    ? position.market_title.split(' - ')[1] 
    : 'NBA Prop'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`rounded-3xl p-5 relative overflow-hidden group border ${isDark ? 'bg-[#0a0b1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
    >
      <div className="relative flex flex-col gap-4">
        {/* Row 1: Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${sideBg} ${sideBorder}`}>
              {position.side === 'long' ? (
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <ArrowUp className="w-5 h-5 text-orange-500" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 flex items-center justify-center">
                  <ArrowDown className="w-5 h-5 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                {playerName}
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {propName}
              </p>
              <p className="text-[11px] font-black text-primary uppercase tracking-wider mt-1">
                ${position.size.toFixed(2)} STAKED
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <AnimatePresence mode="wait">
              {!showConfirm ? (
                <motion.div
                  key="sell_btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    onClick={handleInitialClick}
                    disabled={externalLoading || checkingPrice}
                    className="h-10 px-6 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20 transition-all shrink-0"
                  >
                    {checkingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SELL'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm_btns"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={() => setShowConfirm(false)}
                    className="h-10 px-4 rounded-2xl bg-secondary text-muted-foreground font-black uppercase text-xs"
                  >
                    NO
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={externalLoading}
                    className="h-10 px-6 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20"
                  >
                    {externalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 w-full" />

        {/* Row 2: Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#11122a] rounded-2xl px-4 py-3 flex items-center justify-between border border-white/5">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest">VALUE</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-mono font-bold text-sm tracking-tighter">{position.entry_price.toFixed(1)}</span>
              <span className="text-muted-foreground text-[10px] font-black opacity-40">→</span>
              <span className="text-white font-mono font-bold text-sm tracking-tighter">{displayPrice.toFixed(1)}</span>
            </div>
          </div>
          <div className="bg-[#11122a] rounded-2xl px-4 py-3 flex items-center justify-between border border-white/5">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest">P&L</span>
            <div className={`flex items-center gap-1 font-mono font-bold text-sm ${isProfit ? 'text-primary' : 'text-red-400'}`}>
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
