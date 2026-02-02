'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, ArrowUp, ArrowDown, AlertTriangle, Lock, Clock, X, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { IQDisplay } from '@/components/IQDisplay'
import type { Position, QueuedTrade } from '@/lib/types'
import { isMarketLocked as checkIsLocked, cn } from '@/lib/utils'

interface PositionCardProps {
  position: Position & { game_id?: string }
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
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkingPrice, setCheckingPrice] = useState(false)
  const [freshPrice, setFreshPrice] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'price_changed' | 'confirming' | 'error'>('idle')
  const [limitPrice, setLimitPrice] = useState<number | null>(null)
  const [isLimitEnabled, setIsLimitEnabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [cancellingClose, setCancellingClose] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [showEntry, setShowEntry] = useState(false)

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
              if (isSellLocked) {
                toast.error("let it ride...for a bit", {
                  style: {
                    background: '#11122a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontFamily: 'inherit',
                    fontWeight: 'black',
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    letterSpacing: '0.1em'
                  }
                })
                return
              }

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
          const rawPnlPercent = (position.side === 'long' ? percentChange : -percentChange) * 100
          const isCapped = rawPnlPercent > 100
          const pnlPercent = Math.min(rawPnlPercent, 100)
          const isProfit = pnlPercent >= 0
        
      const isMarketLocked = checkIsLocked(position.market_status)
      
        const timeSinceCreation = now - new Date(position.created_at).getTime()
        const isSellLocked = timeSinceCreation < 180000
        const lockSecondsRemaining = Math.max(0, Math.ceil((180000 - timeSinceCreation) / 1000))

      const canNavigate = position.game_id && position.player_prop_id

      const handleCardClick = (e: React.MouseEvent) => {
        if (!canNavigate) return
        const target = e.target as HTMLElement
        if (target.closest('button') || target.closest('[role="button"]')) return
        router.push(`/markets/${position.game_id}/${position.player_prop_id}`)
      }

      return (
        <div
          onClick={handleCardClick}
          className={`rounded-[2rem] p-4 sm:p-5 relative overflow-hidden group border ${isDark ? 'bg-[#0a0b1e] border-white/5' : 'bg-white border-gray-200 shadow-sm'} ${canNavigate ? 'cursor-pointer hover:border-primary/30 transition-all' : ''}`}
        >
              <div className="relative flex flex-col gap-4">
                {status === 'error' && (
                  <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-2xl">
                    <p className="text-red-400 font-black uppercase tracking-widest text-[10px] px-4 text-center leading-relaxed">
                      {errorMessage}
                    </p>
                      <Button onClick={() => setStatus('idle')} className="mt-2 h-7 px-3 text-[9px] bg-red-400/20 text-red-400 border border-red-400/30 rounded-lg">DISMISS</Button>
                    </div>
                  )}
                  {/* Row 1: Header - Stake in Top Left */}
                <div className="flex items-start justify-between">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEntry(!showEntry)
                    }}
                    className="cursor-pointer"
                  >
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">STAKE</p>
                    <IQDisplay 
                      value={position.size} 
                      valueClassName="text-lg sm:text-xl font-black text-white tracking-tighter" 
                      iconClassName="w-4 h-4 sm:w-5 h-5"
                    />
                  </div>

                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0 ${sideBg} ${sideBorder}`}>
                    {position.side === 'long' ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-orange-500 flex items-center justify-center">
                        <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Player Info */}
                <div className="flex flex-col min-w-0 -mt-2">
                  <h3 className="text-white font-black text-xl sm:text-2xl leading-tight truncate tracking-tighter">
                    {playerName}
                  </h3>
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-0.5 truncate opacity-80">
                    {propName}
                  </p>
                </div>

                {/* Row 3: Stats - Smaller centered boxes */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEntry(!showEntry)
                    }}
                    className="bg-white/5 rounded-2xl p-3 flex flex-col items-center text-center gap-0.5 border border-white/5 transition-all hover:bg-white/10 cursor-pointer"
                  >
                    <span className="text-[8px] font-black text-muted-foreground tracking-widest uppercase">
                      {showEntry ? 'ENTRY' : 'VALUE'}
                    </span>
                    <span className="text-white font-black text-lg sm:text-xl tracking-tighter">
                      {showEntry ? (position.entry_price || 0).toFixed(1) : (displayPrice || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center text-center gap-0.5 border border-white/5 transition-all hover:bg-white/10">
                    <span className="text-[8px] font-black text-muted-foreground tracking-widest uppercase">P&L</span>
                    <div className={`flex flex-col items-center ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-tighter">
                        {isProfit ? '+' : '-'}
                        <IQDisplay 
                          value={Math.abs(((pnlPercent || 0) / 100) * (position.size || 0))} 
                          decimals={1}
                          valueClassName={cn("font-black text-lg sm:text-xl tracking-tighter", isProfit ? 'text-emerald-400' : 'text-red-400')}
                        />
                      </div>
                      <div className="text-[9px] font-black opacity-80 flex items-center gap-1">
                        {isProfit ? '+' : ''}{(pnlPercent || 0).toFixed(1)}%
                        {isCapped && <span className="text-amber-400 text-[8px] tracking-tighter font-black">(MAX)</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 4: Action Button */}
                <div className="flex shrink-0 w-full">
                    <AnimatePresence mode="wait">
                      {status === 'price_changed' ? (
                        <motion.div
                          key="price_update"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col gap-2 w-full"
                        >
                            <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-primary" />
                              <span className="text-[9px] font-black text-white uppercase tracking-tight">Line Changed: {freshPrice?.toFixed(1)}</span>
                            </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={cancelTrade}
                              className="h-10 flex-1 rounded-xl bg-secondary text-muted-foreground font-black uppercase text-[10px]"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => setStatus('confirming')}
                              className="h-10 flex-1 rounded-xl bg-primary text-black font-black uppercase text-[10px]"
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
                              className="flex flex-col gap-3 w-full"
                            >
                              <div className="flex gap-2">
                                <Button
                                  onClick={cancelTrade}
                                  className="h-12 flex-1 px-6 rounded-2xl bg-secondary text-muted-foreground font-black uppercase text-xs"
                                >
                                  NO
                                </Button>
                                <Button
                                  onClick={handleConfirm}
                                  disabled={externalLoading || checkingPrice}
                                  className="h-12 flex-1 px-8 rounded-2xl bg-[#f8564e] hover:bg-[#e04a43] text-white font-black uppercase text-xs shadow-lg shadow-red-500/20"
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
                              className="w-full flex items-center gap-2"
                            >
                              <div className="h-12 flex-1 px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Close Pending</span>
                              </div>
                              {onCancelQueuedTrade && (
                                <Button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    setCancellingClose(true)
                                    try {
                                      await onCancelQueuedTrade(pendingClose.id)
                                    } finally {
                                      setCancellingClose(false)
                                    }
                                  }}
                                  disabled={cancellingClose}
                                  className="h-12 w-12 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl"
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
                              className="w-full"
                            >
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleInitialClick()
                                              }}
                                              disabled={externalLoading || checkingPrice || isMarketLocked}
                                              className={`h-12 w-full px-10 rounded-2xl ${isMarketLocked ? 'bg-red-400/10 text-red-400 cursor-not-allowed border border-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.15)]' : 'bg-[#f8564e] hover:bg-[#e04a43] text-white shadow-lg shadow-red-400/20'} font-black uppercase text-sm flex items-center justify-center gap-2`}
                                            >
                                              {checkingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                <>
                                                  {isMarketLocked ? <Lock className="w-4 h-4" /> : 'SELL'}
                                                </>
                                              )}
                                          </Button>

                            </motion.div>
                            )}
        
                      </AnimatePresence>
                    </div>
  
        </div>
      </div>
    )
  }

