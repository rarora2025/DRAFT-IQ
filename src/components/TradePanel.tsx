'use client'

import { useState, useEffect } from 'react'
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
    
    // Check for 10-minute expiration (only for LIVE markets)
    const isStale = marketStatus === 'LIVE' && lastUpdated ? (now - new Date(lastUpdated).getTime()) > 10 * 60 * 1000 : false
    const isLocked = marketStatus === 'locked' || marketStatus === 'inactive' || marketStatus === 'FROZEN' || marketStatus === 'SETTLED' || isStale
    const canTrade = balance > 0 && tradeSize > 0 && tradeSize <= balance && !isLocked

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
        
        // Final staleness check
        const stillStale = live.lastUpdated ? (new Date().getTime() - new Date(live.lastUpdated).getTime()) > 10 * 60 * 1000 : false
        if (live.status === 'inactive' || live.status === 'locked' || stillStale) {
          setErrorMessage('Market has expired or locked')
          setStatus('error')
          return
        }

        if (Math.abs(live.price - currentTemp) > 0.01) {
          setNewLine(live.price)
          setStatus('price_changed')
          return
        }
      }
      
      setStatus('confirming')
    }

    const acceptPriceChange = () => {
      if (newLine !== null) {
        // currentTemp should have been updated by the parent due to the price check
        // but if not, we use newLine for confirmation display
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
            
            // Final staleness check
            const stillStale = finalLive.lastUpdated ? (new Date().getTime() - new Date(finalLive.lastUpdated).getTime()) > 10 * 60 * 1000 : false
            if (finalLive.status === 'inactive' || finalLive.status === 'locked' || stillStale) {
              setErrorMessage('Market has expired or locked')
              setStatus('error')
              return
            }

            // If the price has moved from what they are looking at in the confirmation screen
            if (Math.abs(finalLive.price - currentTemp) > 0.01) {
              setNewLine(finalLive.price)
              setStatus('price_changed')
              return
            }
          }

          await onTrade(pendingSide, tradeSize)
          setStatus('idle')
          setPendingSide(null)
        } catch (err: any) {
          console.error('Execute trade error:', err)
          setErrorMessage(err.message || 'Trade failed')
          setStatus('error')
          setTimeout(() => setStatus('idle'), 3000)
        }
      }


  const potentialPnl = tradeSize * 1

  return (
    <div className={`rounded-3xl p-8 space-y-8 relative overflow-hidden ${isDark ? 'bg-card border border-border shadow-2xl' : 'bg-white border border-gray-200 shadow-sm'}`}>
        {status === 'error' && (
          <div className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
            <p className="text-red-400 font-black uppercase tracking-widest text-xs px-8 text-center leading-relaxed">
              {errorMessage}
            </p>
            <Button onClick={() => setStatus('idle')} className="mt-4 h-8 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">DISMISS</Button>
          </div>
        )}

        {balance <= 0 && (
          <div className="text-center text-red-400 text-xs font-black uppercase tracking-widest py-3 bg-red-500/10 rounded-xl border border-red-500/20">
            Insufficient balance to trade
          </div>
        )}

        {isLocked && (
          <div className="text-center text-red-400 text-xs font-black uppercase tracking-widest py-3 bg-red-500/10 rounded-xl border border-red-500/20">
            {isStale ? 'Line Expired' : 'Prop Locked'}
          </div>
        )}


      <AnimatePresence mode="wait">
        {status === 'price_changed' ? (
          <motion.div
            key="price_update"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 space-y-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Line Changed</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The live line has updated from <span className="text-white font-mono font-bold">{currentTemp.toFixed(1)}</span> to <span className="text-primary font-mono font-black">{newLine?.toFixed(1)}</span>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={cancelTrade}
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-secondary text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={acceptPriceChange}
                className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary text-black"
              >
                Accept Changes
              </Button>
            </div>
          </motion.div>
          ) : status === 'confirming' && pendingSide ? (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                  <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full border ${
                    pendingSide === 'long' 
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {pendingSide === 'long' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    <span className="font-black text-sm uppercase tracking-widest">
                      {pendingSide === 'long' ? 'GO HIGHER' : 'GO LOWER'}
                    </span>
                  </div>
                <h3 className={`font-display font-black text-2xl uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Confirm Entry</h3>
              </div>

                <div className={`rounded-2xl p-5 space-y-4 ${isDark ? 'bg-background' : 'bg-gray-50'} border border-border`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-bold uppercase tracking-widest text-[10px] ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>Position Stake</span>
                    <span className={`font-mono font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>${tradeSize}</span>
                  </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`font-bold uppercase tracking-widest text-[10px] ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>Live Entry Line</span>
                      <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentTemp.toFixed(2)}</span>
                    </div>
                            <div className={`border-t pt-4 flex justify-between items-center text-sm ${isDark ? 'border-border' : 'border-gray-200'}`}>
                              <span className={`font-bold uppercase tracking-widest text-[10px] ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>Payout Formula</span>
                              <span className="font-mono text-primary font-bold">% Change × Stake</span>
                            </div>
                  </div>


                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={cancelTrade}
                    className={`h-14 rounded-2xl font-black uppercase tracking-widest text-xs ${isDark ? 'bg-secondary hover:bg-secondary/80 text-muted-foreground' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={executeTrade}
                    className={`h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg ${
                      pendingSide === 'long'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
                    }`}
                  >
                    Confirm
                  </Button>
                </div>
            </div>
          ) : (status === 'opening' || status === 'placing') ? (
            <div className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
                <p className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
                  {status === 'opening' ? 'Syncing Price...' : 'Placing Position...'}
                </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Your Stake</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-display font-black text-xl">$</span>
                    <span className={`font-display font-black text-5xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{tradeSize}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Balance</p>
                  <span className={`font-mono font-black ${balance >= tradeSize ? 'text-primary' : 'text-red-400'}`}>${balance.toFixed(2)}</span>
                </div>
              </div>

              <div className="px-1 py-4">
                <div className="relative h-12 flex items-center">
                  <Slider
                    value={[tradeSize]}
                    onValueChange={([v]) => setTradeSize(v)}
                    min={5}
                    max={Math.max(5, maxTrade)}
                    step={5}
                    className="relative z-10"
                    disabled={balance <= 0}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {[5, 25, 50, 100, 250, 500].filter(v => v <= maxTrade).map((val) => (
                    <button
                      key={val}
                      onClick={() => setTradeSize(val)}
                      className={`text-[10px] font-black px-2 py-1 rounded-md transition-all ${
                        tradeSize === val 
                          ? 'bg-primary text-black' 
                          : 'bg-card border border-border text-muted-foreground hover:text-white'
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                  {maxTrade > 5 && ! [5, 25, 50, 100, 250, 500].includes(maxTrade) && (
                    <button
                      onClick={() => setTradeSize(maxTrade)}
                      className={`text-[10px] font-black px-2 py-1 rounded-md transition-all ${
                        tradeSize === maxTrade 
                          ? 'bg-primary text-black' 
                          : 'bg-card border border-border text-muted-foreground hover:text-white'
                      }`}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

                <div className="grid grid-cols-2 gap-5">
                  <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                        <Button
                          onClick={() => initiateConfirm('long')}
                          disabled={disabled || !canTrade}
                          className={`w-full h-20 bg-orange-500 hover:bg-orange-600 text-white font-display font-black text-xl rounded-2xl shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 border-b-4 border-orange-700 ${isStale ? 'grayscale' : ''}`}
                        >
                          <TrendingUp className="w-6 h-6 mr-2" />
                          {isStale ? 'EXPIRED' : 'OVER'}
                        </Button>
                      </motion.div>
    
                      <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                        <Button
                          onClick={() => initiateConfirm('short')}
                          disabled={disabled || !canTrade}
                          className={`w-full h-20 bg-blue-500 hover:bg-blue-600 text-white font-display font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 border-b-4 border-blue-700 ${isStale ? 'grayscale' : ''}`}
                        >
                          <TrendingDown className="w-6 h-6 mr-2" />
                          {isStale ? 'EXPIRED' : 'UNDER'}
                        </Button>
                  </motion.div>
                </div>

                  <div className={`text-center space-y-2 opacity-60`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Live Prediction: <span className={`font-mono text-white`}>{currentTemp.toFixed(2)}</span>
                    </p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Formula: % Change × Stake</p>
                  </div>

            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }