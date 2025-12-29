'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, ArrowUp, ArrowDown, AlertTriangle, Lock, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Position, QueuedTrade } from '@/lib/types'
import { isMarketLocked as checkIsLocked } from '@/lib/utils'

    interface PositionCardProps {
  position: Position
  currentTemp: number
  onClose: (positionId: string, exitPrice: number, limitPrice?: number) => Promise<void>
  onPriceCheck?: () => Promise<{ price: number; status: string; lastUpdated: string }>
  loading?: boolean
    isDark?: boolean
    lastUpdated?: string
    isLiveGame?: boolean
    pendingClose?: QueuedTrade
    onCancelQueuedTrade?: (tradeId: string) => Promise<void>
  }
  
    export function PositionCard({ position, currentTemp, onClose, onPriceCheck, loading: externalLoading, isDark = true, lastUpdated, isLiveGame, pendingClose, onCancelQueuedTrade }: PositionCardProps) {
        const [showConfirm, setShowConfirm] = useState(false)
        const [checkingPrice, setCheckingPrice] = useState(false)
        const [freshPrice, setFreshPrice] = useState<number | null>(null)
        const [status, setStatus] = useState<'idle' | 'price_changed' | 'confirming' | 'error'>('idle')
        const [limitPrice, setLimitPrice] = useState<number | null>(null)
        const [isLimitEnabled, setIsLimitEnabled] = useState(false)
        const [errorMessage, setErrorMessage] = useState<string | null>(null)
        const [now, setNow] = useState(Date.now())
        const [cancellingClose, setCancellingClose] = useState(false)

        const sideBg = position.side === 'long' ? 'bg-orange-500/10' : 'bg-blue-500/10'
        const sideBorder = position.side === 'long' ? 'border-orange-500/20' : 'border-blue-500/20'
        
        // Parse market_title: "LeBron James - Points" -> "LeBron James", "Points"
        const [playerName, propName] = position.market_title ? position.market_title.split(' - ') : ['NBA Prop', '']

        const cancelTrade = () => {
          setStatus('idle')
          setFreshPrice(null)
          setErrorMessage(null)
        }

            const handleInitialClick = async () => {
              if (!onPriceCheck) {
                setStatus('confirming')
                return
              }

              setCheckingPrice(true)
              try {
                const live = await onPriceCheck()
                
                // Be more specific about the error
                if (live.status === 'inactive' || live.status === 'SETTLED' || !live.price) {
                  setErrorMessage('Market has been settled or is no longer active.')
                  setStatus('error')
                  return
                }

                if (live.status === 'locked' || live.status === 'LOCKED' || live.status === 'FROZEN') {
                  setErrorMessage('Market is temporarily frozen. Please try again in a moment.')
                  setStatus('error')
                  return
                }

                // Use a more generous tolerance (3% or 1.0 unit)
                const tolerance = Math.max(1.0, currentTemp * 0.03)
                if (Math.abs(live.price - currentTemp) > tolerance) {
                  setFreshPrice(live.price)
                  setStatus('price_changed')
                } else {
                  // Even if it changed slightly, we'll use the fresh price for the execution
                  setFreshPrice(live.price)
                  setStatus('confirming')
                }
              } catch (err) {
                setErrorMessage('Failed to verify live price.')
                setStatus('error')
              } finally {
                setCheckingPrice(false)
              }
            }

            const handleConfirm = async () => {
              setCheckingPrice(true)
              try {
                // Final price check immediately before execution
                if (onPriceCheck) {
                  const finalLive = await onPriceCheck()
                  
                  if (finalLive.status === 'inactive' || finalLive.status === 'SETTLED' || !finalLive.price) {
                    setErrorMessage('Market is no longer available.')
                    setStatus('error')
                    return
                  }

                  // If it's locked right at the moment of execution
                  if (finalLive.status === 'locked' || finalLive.status === 'LOCKED' || finalLive.status === 'FROZEN') {
                    setErrorMessage('Market just locked. Please try again.')
                    setStatus('error')
                    return
                  }

                  // If price changed again during confirmation, we'll just use the newest price
                  // unless it's a massive move (e.g. > 15%)
                  const massiveTolerance = Math.max(10.0, currentTemp * 0.15)
                  if (Math.abs(finalLive.price - (freshPrice ?? currentTemp)) > massiveTolerance) {
                    setFreshPrice(finalLive.price)
                    setStatus('price_changed')
                    return
                  }
                  
                  // Use the absolute latest price
                  await onClose(position.id, finalLive.price, limitPrice ?? undefined)
                } else {
                  await onClose(position.id, freshPrice ?? currentTemp, limitPrice ?? undefined)
                }
              } catch (err: any) {
                setErrorMessage(err.message || 'Failed to close position')
                setStatus('error')
              } finally {
                setCheckingPrice(false)
              }
            }

          // Update 'now' every second to ensure staleness is re-evaluated
          useEffect(() => {
            const interval = setInterval(() => setNow(Date.now()), 1000)
            return () => clearInterval(interval)
          }, [])
      
          const displayPrice = freshPrice ?? currentTemp
          const priceDiff = displayPrice - position.entry_price
          const percentChange = priceDiff / position.entry_price
          const pnlPercent = (position.side === 'long' ? percentChange : -percentChange) * 100
          const isProfit = pnlPercent >= 0
        
        const isMarketLocked = checkIsLocked(position.market_status)
        
        const timeSinceCreation = now - new Date(position.created_at).getTime()
        const isSellLocked = timeSinceCreation < 60000
        const lockSecondsRemaining = Math.max(0, Math.ceil((60000 - timeSinceCreation) / 1000))

        return (
          <div
            className={`rounded-3xl p-4 sm:p-5 relative overflow-hidden group border ${isDark ? 'bg-[#0a0b1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}
          >
              <div className="relative flex flex-col gap-4">
                {status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-2xl">
                    <p className="text-red-400 font-black uppercase tracking-widest text-[10px] px-4 text-center leading-relaxed">
                      {errorMessage}
                    </p>
                    <Button onClick={() => setStatus('idle')} className="mt-2 h-7 px-3 text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg">DISMISS</Button>
                  </div>
                )}
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
                              className="flex flex-col gap-3 w-full sm:w-auto"
                            >
                              <div className="flex gap-2">
                                <Button
                                  onClick={cancelTrade}
                                  className="h-10 sm:h-11 flex-1 sm:flex-none px-6 rounded-2xl bg-secondary text-muted-foreground font-black uppercase text-xs"
                                >
                                  NO
                                </Button>
                                <Button
                                  onClick={handleConfirm}
                                  disabled={externalLoading || checkingPrice}
                                  className="h-10 sm:h-11 flex-1 sm:flex-none px-8 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20"
                                >
                                  {(externalLoading || checkingPrice) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM'}
                                </Button>
                              </div>
                            </motion.div>
                          ) : pendingClose ? (
                            <motion.div
                              key="pending_close"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="w-full sm:w-auto flex items-center gap-2"
                            >
                              <div className="h-10 sm:h-11 px-4 sm:px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Close Pending</span>
                              </div>
                              {onCancelQueuedTrade && (
                                <Button
                                  onClick={async () => {
                                    setCancellingClose(true)
                                    try {
                                      await onCancelQueuedTrade(pendingClose.id)
                                    } finally {
                                      setCancellingClose(false)
                                    }
                                  }}
                                  disabled={cancellingClose}
                                  className="h-10 sm:h-11 w-10 sm:w-11 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl"
                                >
                                  {cancellingClose ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                </Button>
                              )}
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
                                          disabled={externalLoading || checkingPrice || isMarketLocked || isSellLocked}
                                          className={`h-10 sm:h-11 w-full sm:w-auto px-8 sm:px-10 rounded-2xl ${isMarketLocked ? 'bg-red-500/10 text-red-500 cursor-not-allowed border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : (isSellLocked ? 'bg-gray-500/40 text-gray-400 cursor-not-allowed' : 'bg-[#f8564e] hover:bg-[#e04a43] text-white shadow-lg shadow-red-500/20')} font-black uppercase text-xs flex items-center justify-center gap-2`}
                                        >
                                            {checkingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                              <>
                                                {isMarketLocked ? <Lock className="w-4 h-4" /> : (isSellLocked ? `${lockSecondsRemaining}S LOCK` : 'SELL')}
                                              </>
                                            )}
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
                  <div className={`flex flex-col items-end shrink-0 ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    <div className="flex items-center gap-1 font-mono font-bold text-[11px] sm:text-sm leading-tight">
                      {isProfit ? '+' : '-'}${Math.abs((pnlPercent / 100) * position.size).toFixed(2)}
                    </div>
                    <div className="text-[9px] font-black opacity-80 leading-none mt-0.5">
                      {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
        </div>
      </div>
    </div>
  )
}
