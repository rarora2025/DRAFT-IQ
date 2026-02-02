'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Loader2, Check, AlertTriangle, Activity, Lock, Clock, X, ChevronRight } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { isMarketLocked, cn } from '@/lib/utils'
import { IQDisplay } from '@/components/IQDisplay'
import type { QueuedTrade } from '@/lib/types'

    interface TradePanelProps {
  balance: number
  currentTemp: number
  onTrade: (side: 'long' | 'short', size: number, price?: number, limitPrice?: number, toleranceOverride?: number) => Promise<void>
  onPriceCheck?: () => Promise<{ price: number; status: string; lastUpdated: string }>
  disabled?: boolean
    isDark?: boolean
    propType?: string
    marketStatus?: string
    lastUpdated?: string
    isLiveGame?: boolean
    queuedTrades?: QueuedTrade[]
    onCancelQueuedTrade?: (tradeId: string) => Promise<void>
    defaultTolerance?: number
    onUpdateDefaultTolerance?: (tolerance: number) => Promise<void>
    playerId?: string
  }

type TradeStatus = 'idle' | 'confirming' | 'opening' | 'placing' | 'success' | 'error' | 'price_changed'

export function TradePanel({ balance, currentTemp, onTrade, onPriceCheck, disabled, isDark = true, propType = 'Points', marketStatus, lastUpdated, isLiveGame, queuedTrades = [], onCancelQueuedTrade, defaultTolerance = 5, onUpdateDefaultTolerance, playerId }: TradePanelProps) {
    const router = useRouter()
    const [tradeSize, setTradeSize] = useState(50)
    const [isEditingStake, setIsEditingStake] = useState(false)
    const [stakeInputValue, setStakeInputValue] = useState('50')
    const [limitPrice, setLimitPrice] = useState<number | null>(null)
    const [isLimitEnabled, setIsLimitEnabled] = useState(false)
    const [toleranceOverride, setToleranceOverride] = useState<number | null>(null)
    const [isSavingTolerance, setIsSavingTolerance] = useState(false)
    const [showToleranceSettings, setShowToleranceSettings] = useState(false)
    const [status, setStatus] = useState<TradeStatus>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [pendingSide, setPendingSide] = useState<'long' | 'short' | null>(null)
    const [newLine, setNewLine] = useState<number | null>(null)
    const [now, setNow] = useState(Date.now())
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    // Update 'now' every second to ensure staleness is re-evaluated
    useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 1000)
      return () => clearInterval(interval)
    }, [])

    const unit = 'point'

    const shares = useMemo(() => {
      return (tradeSize / currentTemp).toFixed(2)
    }, [tradeSize, currentTemp])

    const maxTrade = Math.max(0, Math.min(balance, 500))
    
        const isLocked = isMarketLocked(marketStatus)
        const canTrade = balance > 0 && tradeSize > 0 && tradeSize <= balance && !isLocked

        const isLive = marketStatus === 'LIVE'

          useEffect(() => {
            if (tradeSize > maxTrade) {
              const clamped = Math.max(5, maxTrade)
              setTradeSize(clamped)
              setStakeInputValue(clamped.toString())
            }
          }, [balance, maxTrade, tradeSize])

      const initiateConfirm = async (side: 'long' | 'short') => {
        if (disabled || !canTrade) return
        
        setPendingSide(side)
        
          // Check for live price before showing confirmation
          if (onPriceCheck) {
            setStatus('opening')
            try {
              const live = await onPriceCheck()
              
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
                setNewLine(live.price)
                setStatus('price_changed')
                return
              }
              
              // If price changed slightly, we'll just update it silently for the confirmation screen
              if (live.price !== currentTemp) {
                setNewLine(live.price)
              }
            } catch (err) {
              setErrorMessage('Failed to verify live price.')
              setStatus('error')
              return
            }
          }
          
          setStatus('confirming')
        }

        const acceptPriceChange = () => {
          if (newLine !== null) {
            // Price is already updated in newLine
            setStatus('confirming')
          }
        }

        const cancelTrade = () => {
          setPendingSide(null)
          setNewLine(null)
          setStatus('idle')
        }

            const executeTrade = async () => {
              if (!pendingSide || !canTrade) return
              
              setStatus('placing')
              setErrorMessage(null)
              try {
                let executionPrice = newLine ?? currentTemp

                // Final price verification immediately before trade execution
                if (onPriceCheck) {
                  const finalLive = await onPriceCheck()
                  
                  if (finalLive.status === 'inactive' || finalLive.status === 'SETTLED' || !finalLive.price) {
                    setErrorMessage('Market is no longer available.')
                    setStatus('error')
                    return
                  }

                  if (finalLive.status === 'locked' || finalLive.status === 'LOCKED' || finalLive.status === 'FROZEN') {
                    setErrorMessage('Market just locked. Please try again.')
                    setStatus('error')
                    return
                  }

                  // If price changed again during confirmation, we'll just use the newest price
                  // unless it's a massive move (e.g. > 15%)
                  const massiveTolerance = Math.max(10.0, currentTemp * 0.15)
                  if (Math.abs(finalLive.price - executionPrice) > massiveTolerance) {
                    setNewLine(finalLive.price)
                    setStatus('price_changed')
                    return
                  }
                  
                  executionPrice = finalLive.price
                }

                await onTrade(pendingSide, tradeSize, executionPrice, limitPrice ?? undefined, toleranceOverride ?? undefined)
                setStatus('success')
              } catch (err: any) {
              console.error('Execute trade error:', err)
              setErrorMessage(err.message || 'Trade failed')
              setStatus('error')
            }
          }



  const potentialPayout = useMemo(() => {
    // Standard payout is 1:1 for demonstration, but we can make it look more professional
    // by showing it as a "Potential Return"
    return (tradeSize * 1.0).toFixed(2)
  }, [tradeSize])

    return (
      <div className={`relative space-y-6 ${isDark ? 'text-white' : 'text-gray-900'} w-full`}>
        <div className={`rounded-[2.5rem] pt-8 px-8 pb-4 space-y-4 relative overflow-hidden flex flex-col ${isDark ? 'bg-[#020420]/60 border border-white/10 shadow-2xl backdrop-blur-md' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {isLocked && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-[#020420]/80 backdrop-blur-xl" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-red-400/10 border border-red-400/20 rounded-3xl p-8 w-full text-center space-y-4 shadow-2xl"
              >
                <div className="w-20 h-20 bg-red-400/20 rounded-full flex items-center justify-center mx-auto border border-red-400/30">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Market Frozen</h3>
                  <p className="text-red-400/80 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Trading temporarily suspended</p>
                </div>
              </motion.div>
            </div>
          )}

        <AnimatePresence mode="wait">
          {status === 'price_changed' ? (
            <motion.div
              key="price_update"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center py-4"
            >
              <div className="bg-primary/10 border border-primary/20 rounded-[2rem] p-8 space-y-4">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Line Volatility</h3>
                <p className="text-xs text-zinc-400 leading-relaxed uppercase font-black tracking-widest">
                  The market moved from <span className="text-white font-mono">{currentTemp.toFixed(1)}</span> to <span className="text-primary font-mono">{newLine?.toFixed(1)}</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={cancelTrade}
                  className="h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white/5 text-zinc-500 hover:bg-white/10"
                >
                  Decline
                </Button>
                <Button
                  onClick={acceptPriceChange}
                  className="h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-black hover:opacity-90 shadow-[0_0_20px_rgba(61,225,0,0.3)]"
                >
                  Accept & Trade
                </Button>
              </div>
            </motion.div>
          ) : status === 'confirming' && pendingSide ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
                <div className="text-center space-y-4">
                  <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border-2 ${
                    pendingSide === 'long' 
                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {pendingSide === 'long' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    <span className="font-black text-sm uppercase tracking-[0.2em]">
                      {pendingSide === 'long' ? 'Go Higher' : 'Go Lower'}
                    </span>
                  </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Trade Details</h3>
                   </div>
     
                         <div className="rounded-[2rem] p-4 space-y-2 bg-white/5 border border-white/10">
                           <div className="flex justify-between items-center">
                                 <span className="font-black uppercase tracking-widest text-[9px] text-zinc-500">Stake Amount</span>
                                   <IQDisplay 
                                     value={tradeSize} 
                                     valueClassName="text-base text-white" 
                                     iconClassName="w-3.5 h-3.5"
                                     iconPosition="right"
                                   />
    
                               </div>
                                 <div className="flex justify-between items-center">
                                   <span className="font-black uppercase tracking-widest text-[9px] text-zinc-500">Entry Level</span>
                                   <span className="font-mono font-black text-base text-primary">{(newLine ?? currentTemp).toFixed(1)} {propType}</span>
                                 </div>

                     <div className="border-t border-white/5 pt-4 space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                  Execution Settings
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setIsLimitEnabled(!isLimitEnabled)
                                    if (!isLimitEnabled) setLimitPrice(currentTemp)
                                    else setLimitPrice(null)
                                  }}
                                  className={`h-6 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors ${
                                    isLimitEnabled ? 'bg-amber-500 text-black hover:bg-amber-600' : 'bg-white/5 text-zinc-500 hover:text-white'
                                  }`}
                                >
                                  {isLimitEnabled ? 'Limit Active' : 'Set Price Limit'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => setShowToleranceSettings(!showToleranceSettings)}
                                  className={cn(
                                    "h-6 w-6 p-0 rounded-lg transition-colors",
                                    showToleranceSettings ? "bg-primary text-black" : "bg-white/5 text-zinc-500 hover:text-white"
                                  )}
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {showToleranceSettings && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 overflow-hidden"
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[8px] font-black text-primary uppercase tracking-widest">
                                      Auto-Execute Tolerance
                                    </span>
                                    <span className="text-xs font-mono font-bold text-primary">
                                      {toleranceOverride ?? defaultTolerance}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-zinc-500 font-mono">1%</span>
                                    <Slider
                                      value={[toleranceOverride ?? defaultTolerance]}
                                      onValueChange={([v]) => setToleranceOverride(v)}
                                      min={1}
                                      max={15}
                                      step={1}
                                      className="flex-1 h-2"
                                    />
                                    <span className="text-[9px] text-zinc-500 font-mono">15%</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {isLimitEnabled && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-tight max-w-[150px]">
                                    Execute only if price is better or within:
                                  </span>
                                  <span className="text-lg font-black font-mono text-white">
                                    {limitPrice?.toFixed(1)}
                                  </span>
                                </div>
                                <Slider
                                  value={[limitPrice ?? currentTemp]}
                                  onValueChange={([v]) => setLimitPrice(v)}
                                  min={Math.max(0, (newLine ?? currentTemp) - 20)}
                                  max={(newLine ?? currentTemp) + 20}
                                  step={0.1}
                                  className="h-3"
                                />
                              </motion.div>
                            )}
                        </div>
                     </div>
                   </div>


              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={cancelTrade}
                  className="h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white/5 text-zinc-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeTrade}
                  className={`h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl ${
                    pendingSide === 'long'
                      ? 'bg-orange-500 text-white shadow-orange-500/30'
                      : 'bg-blue-500 text-white shadow-blue-500/30'
                  }`}
                >
                  Confirm Trade
                </Button>
              </div>
            </motion.div>
            ) : (status === 'opening' || status === 'placing') ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                  <p className="font-black uppercase tracking-[0.3em] text-[10px] text-primary animate-pulse">
                    placing trade
                  </p>
                </div>
              ) : status === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center space-y-4"
                  >
                  <div className="relative mx-auto w-20 h-20">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200 }}
                      className="absolute inset-0 bg-primary/20 rounded-full blur-xl" 
                    />
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                      className="relative w-full h-full bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-white/20"
                    >
                      <Check className="w-10 h-10 text-black stroke-[4]" />
                    </motion.div>
                  </div>
                
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Trade Placed!</h3>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">Your position is now active</p>
                  </div>



                  <div className="space-y-2">
                    <Button
                      onClick={() => router.push('/portfolio')}
                      className="w-full h-16 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95"
                    >
                      View your Portfolio
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <button 
                      onClick={() => setStatus('idle')}
                      className="text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
                    >
                      Make another trade
                    </button>
                  </div>
              </motion.div>
            ) : (

            <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-2 w-full">
                  <div className="flex justify-between items-center w-full">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">MAKE A TRADE</p>
                  </div>
                <div className="flex items-baseline gap-2">
                  {isEditingStake ? (
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        value={stakeInputValue}
                        onChange={(e) => setStakeInputValue(e.target.value)}
                        onBlur={() => {
                          setIsEditingStake(false)
                          const val = parseInt(stakeInputValue)
                          if (!isNaN(val)) {
                            const clamped = Math.max(5, Math.min(val, maxTrade))
                            setTradeSize(clamped)
                            setStakeInputValue(clamped.toString())
                          } else {
                            setStakeInputValue(tradeSize.toString())
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur()
                          }
                        }}
                        className="text-6xl font-black font-mono tracking-tighter text-white bg-transparent border-b-2 border-primary focus:outline-none w-48"
                        autoFocus
                      />
                      <span className="text-primary font-black text-2xl">IQ Points</span>
                    </div>
                  ) : (
                        <div className="flex items-baseline gap-2 cursor-text" onClick={() => {
                        setStakeInputValue(tradeSize.toString())
                        setIsEditingStake(true)
                      }}>
                            <IQDisplay 
                              value={tradeSize} 
                              valueClassName="text-6xl text-white" 
                              iconClassName="w-12 h-12"
                              iconPosition="right"
                            />

                        </div>
                  )}
                </div>
              </div>
            </div>

                  <div className="px-2">
                    <Slider
                      value={[tradeSize]}
                      onValueChange={([v]) => {
                        setTradeSize(v)
                        setStakeInputValue(v.toString())
                      }}
                      min={5}
                      max={Math.max(5, maxTrade)}
                      step={5}
                      className="h-4"
                      disabled={balance <= 0}
                    />
                  </div>

                  <div className="flex items-center gap-2 px-2">
                    {[50, 100, 250, 500].filter(amt => amt <= maxTrade).map(amt => (
                      <button
                        key={amt}
                        onClick={() => {
                          setTradeSize(amt)
                          setStakeInputValue(amt.toString())
                        }}
                        disabled={balance <= 0}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          tradeSize === amt
                            ? 'bg-primary text-black'
                            : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {amt} IQ
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const max = Math.max(5, maxTrade)
                        setTradeSize(max)
                        setStakeInputValue(max.toString())
                      }}
                      disabled={balance <= 0}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        tradeSize === maxTrade
                          ? 'bg-primary text-black'
                          : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Max
                    </button>
                  </div>

                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                              <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                                <Button
                                  onClick={() => initiateConfirm('long')}
                                  disabled={disabled || !canTrade}
                                  className={`w-full h-24 sm:h-28 lg:h-32 rounded-[2rem] transition-all flex flex-col items-center justify-center gap-2 group px-1 sm:px-2 relative overflow-hidden border-b-[6px] active:border-b-0 active:translate-y-[2px] ${
                                    isLocked 
                                      ? 'bg-zinc-800/50 text-zinc-600 border-zinc-900 cursor-not-allowed' 
                                      : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white border-orange-800 shadow-[0_10px_30px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_40px_rgba(249,115,22,0.4)] hover:brightness-110'
                                  }`}
                                >
                                  {/* Glossy Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
                                  
                                  <div className="flex flex-col items-center gap-1 relative z-10">
                                    {isLocked ? (
                                      <Lock className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                                    ) : (
                                      <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-lg group-hover:-translate-y-1 transition-transform duration-300" />
                                    )}
                                    <span className="font-[900] text-2xl sm:text-3xl uppercase tracking-[0.15em] drop-shadow-md">
                                      {isLocked ? 'Locked' : 'Higher'}
                                    </span>
                                  </div>
                                </Button>
                              </motion.div>
          
                              <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                                <Button
                                  onClick={() => initiateConfirm('short')}
                                  disabled={disabled || !canTrade}
                                  className={`w-full h-24 sm:h-28 lg:h-32 rounded-[2rem] transition-all flex flex-col items-center justify-center gap-2 group px-1 sm:px-2 relative overflow-hidden border-b-[6px] active:border-b-0 active:translate-y-[2px] ${
                                    isLocked 
                                      ? 'bg-zinc-800/50 text-zinc-600 border-zinc-900 cursor-not-allowed' 
                                      : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-800 shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.4)] hover:brightness-110'
                                  }`}
                                >
                                  {/* Glossy Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
                                  
                                  <div className="flex flex-col items-center gap-1 relative z-10">
                                    {isLocked ? (
                                      <Lock className="w-6 h-6 sm:w-8 sm:h-8 opacity-50" />
                                    ) : (
                                      <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-lg group-hover:translate-y-1 transition-transform duration-300" />
                                    )}
                                    <span className="font-[900] text-2xl sm:text-3xl uppercase tracking-[0.15em] drop-shadow-md">
                                      {isLocked ? 'Locked' : 'Lower'}
                                    </span>
                                  </div>
                                </Button>
                              </motion.div>
                            </div>
  


  
                          {/* Disclaimer removed per user request */}
  
                  </div>
            )}
          </AnimatePresence>
        </div>

        {queuedTrades.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Queued Trades</h3>
            </div>
            <div className={`rounded-[2rem] p-4 space-y-3 ${isDark ? 'bg-[#020420]/60 border border-white/10' : 'bg-white border border-gray-200'}`}>
              {queuedTrades.map((qt) => (
                <div key={qt.id} className="flex items-center justify-between gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${qt.side === 'long' ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                      {qt.side === 'long' ? (
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                      <div className="min-w-0">
                          <p className="text-xs font-black text-white uppercase truncate">
                            {qt.trade_type === 'open' ? (qt.side === 'long' ? 'OVER' : 'UNDER') : 'Close'}
                          </p>
                        <p className="text-[9px] font-bold text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis">
                          ${Number(qt.size).toFixed(2)} @ {Number(qt.submitted_price).toFixed(1)}
                          {qt.limit_price && (
                            <span className="text-amber-500 ml-1">
                              (L: {Number(qt.limit_price).toFixed(1)})
                            </span>
                          )}
                        </p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider px-2 py-1 bg-amber-500/10 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="hidden xs:inline">Pending</span>
                    </span>
                    {onCancelQueuedTrade && (
                      <Button
                        onClick={async () => {
                          setCancellingId(qt.id)
                          try {
                            await onCancelQueuedTrade(qt.id)
                          } finally {
                            setCancellingId(null)
                          }
                        }}
                        disabled={cancellingId === qt.id}
                        className="h-7 w-7 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg flex-shrink-0"
                      >
                        {cancellingId === qt.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }