'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface TradePanelProps {
  balance: number
  currentTemp: number
  onTrade: (side: 'long' | 'short', size: number) => Promise<void>
  onPriceCheck?: () => Promise<{ price: number; status: string; lastUpdated: string }>
  disabled?: boolean
    isDark?: boolean
    propType?: string
    marketStatus?: string
    lastUpdated?: string
  }

type TradeStatus = 'idle' | 'confirming' | 'opening' | 'placing' | 'success' | 'error' | 'price_changed'

export function TradePanel({ balance, currentTemp, onTrade, onPriceCheck, disabled, isDark = true, propType = 'Points', marketStatus, lastUpdated }: TradePanelProps) {
  const [tradeSize, setTradeSize] = useState(50)
    const [status, setStatus] = useState<TradeStatus>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [pendingSide, setPendingSide] = useState<'long' | 'short' | null>(null)
    const [newLine, setNewLine] = useState<number | null>(null)
    const [now, setNow] = useState(Date.now())

    // Update 'now' every second to ensure staleness is re-evaluated
    useEffect(() => {
      const interval = setInterval(() => setNow(Date.now()), 1000)
      return () => clearInterval(interval)
    }, [])

    const unit = 'point'

    const maxTrade = Math.max(0, Math.min(balance, 500))
    
        const isLocked = marketStatus === 'locked' || marketStatus === 'inactive' || marketStatus === 'FROZEN' || marketStatus === 'SETTLED' || marketStatus === 'LOCKED'
        const isLive = marketStatus === 'LIVE'
        const isStale = isLive && lastUpdated && (now - new Date(lastUpdated).getTime() > 120 * 1000)
        
        const canTrade = balance > 0 && tradeSize > 0 && tradeSize <= balance && !isLocked && !isStale

        useEffect(() => {
          if (tradeSize > maxTrade) {
            setTradeSize(Math.max(5, maxTrade))
          }
        }, [balance, maxTrade, tradeSize])

      const initiateConfirm = async (side: 'long' | 'short') => {
        if (disabled || !canTrade) return
        
        setPendingSide(side)
        
          // Check for live price before showing confirmation
          if (onPriceCheck) {
            setStatus('opening')
            const live = await onPriceCheck()
            
            if (live.status === 'inactive' || live.status === 'locked' || live.status === 'LOCKED' || !live.price) {
              setErrorMessage('Market has disappeared or been locked.')
              setStatus('error')
              return
            }

            // Much more reasonable tolerance (5% change allowed before forcing re-confirm)
            const tolerance = currentTemp * 0.05
            if (Math.abs(live.price - currentTemp) > tolerance && Math.abs(live.price - currentTemp) > 2.0) {
              setNewLine(live.price)
              setStatus('price_changed')
              return
            }
          }
          
          setStatus('confirming')
        }

        const acceptPriceChange = () => {
          if (newLine !== null) {
            // Update the status to confirming directly with the new price
            // The parent should be refreshing currentTemp
            setNewLine(null)
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
              // Final price verification immediately before trade execution
              if (onPriceCheck) {
                const finalLive = await onPriceCheck()
                
                if (finalLive.status === 'inactive' || finalLive.status === 'locked' || finalLive.status === 'LOCKED' || !finalLive.price) {
                  setErrorMessage('Market is no longer available.')
                  setStatus('error')
                  return
                }

                  // Significantly increased tolerance for final execution (10% or 5.0 units)
                  // This is to ensure trades "go through" even with high volatility
                  const finalTolerance = Math.max(5.0, currentTemp * 0.1)
                  if (Math.abs(finalLive.price - currentTemp) > finalTolerance) {
                    setNewLine(finalLive.price)
                    setStatus('price_changed')
                    return
                  }
              }

              await onTrade(pendingSide, tradeSize)
              setStatus('success')
              setTimeout(() => {
                setStatus('idle')
                setPendingSide(null)
              }, 2000)
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
      <div className={`relative space-y-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        <div className={`rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden ${isDark ? 'bg-[#020420]/60 border border-white/10 shadow-2xl backdrop-blur-md' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {isLocked || isStale ? (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-[#020420]/80 backdrop-blur-xl" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative bg-red-500/10 border border-red-500/20 rounded-3xl p-8 w-full text-center space-y-4 shadow-2xl"
              >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                  <Activity className="w-10 h-10 text-red-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                    {isLocked ? 'Market Frozen' : 'Syncing Line...'}
                  </h3>
                  <p className="text-red-500/80 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                    {isLocked ? 'Trading temporarily suspended' : 'Waiting for fresh API data'}
                  </p>
                </div>
              </motion.div>
            </div>
          ) : null}

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
                <div className={`inline-flex items-center gap-3 px-8 py-3 rounded-full border-2 ${
                  pendingSide === 'long' 
                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}>
                  {pendingSide === 'long' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  <span className="font-black text-base uppercase tracking-[0.2em]">
                    {pendingSide === 'long' ? 'Go Higher' : 'Go Lower'}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Execution Details</h3>
              </div>

              <div className="rounded-[2rem] p-6 space-y-4 bg-white/5 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-[10px] text-zinc-500">Position Stake</span>
                  <span className="font-mono font-black text-xl text-white">${tradeSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase tracking-widest text-[10px] text-zinc-500">Execution Line</span>
                  <span className="font-mono font-black text-xl text-primary">{currentTemp.toFixed(1)}</span>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-black uppercase tracking-widest text-[10px] text-zinc-500">Risk Profile</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Dynamic Δ Exposure</span>
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
            <div className="py-20 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="font-black uppercase tracking-[0.3em] text-[10px] text-primary animate-pulse">
                {status === 'opening' ? 'Verifying Node...' : 'Executing Block...'}
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Stake Amount</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-primary font-black text-2xl">$</span>
                    <span className="text-6xl font-black font-mono tracking-tighter text-white">{tradeSize}</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Available</p>
                  <span className={`text-sm font-black font-mono ${balance >= tradeSize ? 'text-zinc-400' : 'text-red-500'}`}>
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="px-2">
                  <Slider
                    value={[tradeSize]}
                    onValueChange={([v]) => setTradeSize(v)}
                    min={5}
                    max={Math.max(5, maxTrade)}
                    step={5}
                    className="h-4"
                    disabled={balance <= 0}
                  />
                </div>
                <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[5, 25, 50, 100, 250, 500].filter(v => v <= maxTrade).map((val) => (
                    <button
                      key={val}
                      onClick={() => setTradeSize(val)}
                      className={`flex-1 min-w-[60px] h-10 rounded-xl text-[10px] font-black transition-all border ${
                        tradeSize === val 
                          ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(61,225,0,0.2)]' 
                          : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                  <Button
                    onClick={() => initiateConfirm('long')}
                    disabled={disabled || !canTrade}
                    className="w-full h-24 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] shadow-2xl shadow-orange-500/20 transition-all border-b-8 border-orange-700 active:border-b-0 active:translate-y-1 flex flex-col items-center justify-center gap-1 group"
                  >
                    <TrendingUp className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
                    <span className="font-black text-base uppercase tracking-[0.2em]">Higher</span>
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                  <Button
                    onClick={() => initiateConfirm('short')}
                    disabled={disabled || !canTrade}
                    className="w-full h-24 bg-blue-500 hover:bg-blue-600 text-white rounded-[2rem] shadow-2xl shadow-blue-500/20 transition-all border-b-8 border-blue-700 active:border-b-0 active:translate-y-1 flex flex-col items-center justify-center gap-1 group"
                  >
                    <TrendingDown className="w-8 h-8 transition-transform group-hover:translate-y-1" />
                    <span className="font-black text-base uppercase tracking-[0.2em]">Lower</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}