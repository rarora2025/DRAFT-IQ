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
  disabled?: boolean
  isDark?: boolean
  propType?: string
}

type TradeStatus = 'idle' | 'confirming' | 'processing' | 'success' | 'error'

export function TradePanel({ balance, currentTemp, onTrade, disabled, isDark = true, propType = 'Points' }: TradePanelProps) {
  const [tradeSize, setTradeSize] = useState(50)
  const [status, setStatus] = useState<TradeStatus>('idle')
  const [pendingSide, setPendingSide] = useState<'long' | 'short' | null>(null)

  const unit = 'point'

  const maxTrade = Math.max(0, Math.min(balance, 500))
  const canTrade = balance > 0 && tradeSize > 0 && tradeSize <= balance

  useEffect(() => {
    if (tradeSize > maxTrade) {
      setTradeSize(Math.max(5, maxTrade))
    }
  }, [balance, maxTrade, tradeSize])

  const initiateConfirm = (side: 'long' | 'short') => {
    if (disabled || !canTrade) return
    setPendingSide(side)
    setStatus('confirming')
  }

  const cancelTrade = () => {
    setPendingSide(null)
    setStatus('idle')
  }

  const executeTrade = async () => {
    if (!pendingSide || !canTrade) return
    
    setStatus('processing')
    try {
      await onTrade(pendingSide, tradeSize)
      setStatus('success')
      setTimeout(() => {
        setStatus('idle')
        setPendingSide(null)
      }, 1500)
    } catch {
      setStatus('error')
      setTimeout(() => {
        setStatus('idle')
        setPendingSide(null)
      }, 2000)
    }
  }

  const potentialPnl = tradeSize * 1

  return (
    <div className={`rounded-3xl p-8 space-y-8 relative overflow-hidden ${isDark ? 'bg-card border border-border shadow-2xl' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-primary/10 flex items-center justify-center z-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-primary/20 border border-primary/30 rounded-full p-6 shadow-lg shadow-primary/20"
            >
              <Check className="w-10 h-10 text-primary" />
            </motion.div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500/10 flex items-center justify-center z-10 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-red-500/20 border border-red-500/30 rounded-full p-6 shadow-lg shadow-red-500/20"
            >
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {balance <= 0 && (
        <div className="text-center text-red-400 text-xs font-black uppercase tracking-widest py-3 bg-red-500/10 rounded-xl border border-red-500/20">
          Insufficient balance to trade
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'confirming' && pendingSide ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
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
            </motion.div>
          ) : status === 'processing' ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
              <p className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>Opening Position...</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Select Stake</p>
                  <span className={`font-display font-black text-4xl ${isDark ? 'text-white' : 'text-gray-900'}`}>${tradeSize}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Max Trade</p>
                  <span className="font-mono font-bold text-muted-foreground">${maxTrade > 0 ? maxTrade : 0}</span>
                </div>
              </div>

              <div className="px-2">
                <Slider
                  value={[tradeSize]}
                  onValueChange={([v]) => setTradeSize(v)}
                  min={5}
                  max={Math.max(5, maxTrade)}
                  step={5}
                  className="py-4"
                  disabled={balance <= 0}
                />
              </div>

                <div className="grid grid-cols-2 gap-5">
                  <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                      <Button
                        onClick={() => initiateConfirm('long')}
                        disabled={disabled || !canTrade}
                        className="w-full h-20 bg-orange-500 hover:bg-orange-600 text-white font-display font-black text-xl rounded-2xl shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50 border-b-4 border-orange-700"
                      >
                        <TrendingUp className="w-6 h-6 mr-2" />
                        OVER
                      </Button>
                    </motion.div>
  
                    <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                      <Button
                        onClick={() => initiateConfirm('short')}
                        disabled={disabled || !canTrade}
                        className="w-full h-20 bg-blue-500 hover:bg-blue-600 text-white font-display font-black text-xl rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 border-b-4 border-blue-700"
                      >
                        <TrendingDown className="w-6 h-6 mr-2" />
                        UNDER
                      </Button>
                  </motion.div>
                </div>

                  <div className={`text-center space-y-2 opacity-60`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-muted-foreground' : 'text-gray-500'}`}>
                      Live Prediction: <span className={`font-mono text-white`}>{currentTemp.toFixed(2)}</span>
                    </p>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Formula: % Change × Stake</p>
                  </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}