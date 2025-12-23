'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'
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
    const [status, setStatus] = useState<'idle' | 'price_changed' | 'confirming'>('idle')

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
          if (Math.abs(live - currentTemp) > 0.01) {
            setFreshPrice(live)
            setStatus('price_changed')
            return
          }
          setFreshPrice(live)
        } finally {
          setCheckingPrice(false)
        }
      }
      setStatus('confirming')
    }

    const handleConfirm = async () => {
      if (onPriceCheck) {
        setCheckingPrice(true)
        try {
          const finalLive = await onPriceCheck()
          if (Math.abs(finalLive - displayPrice) > 0.01) {
            setFreshPrice(finalLive)
            setStatus('price_changed')
            return
          }
        } finally {
          setCheckingPrice(false)
        }
      }
      await onClose(position.id, displayPrice)
      setStatus('idle')
    }

    const cancelTrade = () => {
      setFreshPrice(null)
      setStatus('idle')
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
    <div
      className={`rounded-3xl p-4 sm:p-5 relative overflow-hidden group border ${isDark ? 'bg-[#0a0b1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
    >
      <div className="relative flex flex-col gap-4">
        {/* Row 1: Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden">
            <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${sideBg} ${sideBorder}`}>
              {position.side === 'long' ? (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <ArrowUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-500" />
                </div>
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-blue-500 flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-500" />
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-white font-bold text-[14px] sm:text-lg leading-tight truncate">
                {playerName}
              </h3>
              <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] sm:tracking-widest mt-0.5 truncate">
                {propName}
              </p>
              <p className="text-[9px] sm:text-[11px] font-black text-primary uppercase tracking-wider mt-0.5 sm:mt-1">
                ${position.size.toFixed(2)} STAKED
              </p>
            </div>
          </div>

            <div className="flex justify-end shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
              <AnimatePresence mode="wait">
                {status === 'price_changed' ? (
                  <motion.div
                    key="price_update"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-2 w-full sm:w-auto"
                  >
                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-black text-white uppercase tracking-tight">Line Changed: {freshPrice?.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={cancelTrade}
                        className="h-9 flex-1 sm:flex-none px-4 rounded-xl bg-secondary text-muted-foreground font-black uppercase text-[10px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setStatus('confirming')}
                        className="h-9 flex-1 sm:flex-none px-4 rounded-xl bg-primary text-black font-black uppercase text-[10px]"
                      >
                        Accept
                      </Button>
                    </div>
                  </motion.div>
                ) : status === 'confirming' ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex gap-2 w-full sm:w-auto"
                  >
                    <Button
                      onClick={cancelTrade}
                      className="h-10 sm:h-11 flex-1 sm:flex-none px-6 rounded-2xl bg-secondary text-muted-foreground font-black uppercase text-xs"
                    >
                      NO
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      disabled={externalLoading}
                      className="h-10 sm:h-11 flex-1 sm:flex-none px-8 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20"
                    >
                      {externalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM'}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={handleInitialClick}
                      disabled={externalLoading || checkingPrice}
                      className="h-10 sm:h-11 w-full sm:w-auto px-8 sm:px-10 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20 transition-all"
                    >
                      {checkingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SELL'}
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
          <div className="bg-[#11122a] rounded-2xl px-2.5 sm:px-4 py-3 flex items-center justify-between border border-white/5 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-widest shrink-0">VALUE</span>
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="text-white font-mono font-bold text-[11px] sm:text-sm tracking-tighter shrink-0">{position.entry_price.toFixed(1)}</span>
              <span className="text-muted-foreground text-[9px] font-black opacity-40 shrink-0">→</span>
              <span className="text-white font-mono font-bold text-[11px] sm:text-sm tracking-tighter truncate">{displayPrice.toFixed(1)}</span>
            </div>
          </div>
          <div className="bg-[#11122a] rounded-2xl px-2.5 sm:px-4 py-3 flex items-center justify-between border border-white/5 overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground tracking-widest shrink-0">P&L</span>
            <div className={`flex items-center gap-1 font-mono font-bold text-[11px] sm:text-sm shrink-0 ${isProfit ? 'text-primary' : 'text-red-400'}`}>
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
