'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface TradePanelProps {
  balance: number
  currentTemp: number
  onTrade: (side: 'long' | 'short', size: number) => Promise<void>
  disabled?: boolean
  isDark?: boolean
}

type TradeStatus = 'idle' | 'confirming' | 'processing' | 'success' | 'error'

export function TradePanel({ balance, currentTemp, onTrade, disabled, isDark = true }: TradePanelProps) {
  const [tradeSize, setTradeSize] = useState(50)
  const [status, setStatus] = useState<TradeStatus>('idle')
  const [pendingSide, setPendingSide] = useState<'long' | 'short' | null>(null)

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
    <div className={`rounded-2xl p-6 space-y-6 relative overflow-hidden ${isDark ? 'bg-[#111116] border border-[#27272a]' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500/20 border border-emerald-500/30 rounded-full p-4"
            >
              <Check className="w-8 h-8 text-emerald-400" />
            </motion.div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-red-500/10 flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-red-500/20 border border-red-500/30 rounded-full p-4"
            >
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {balance <= 0 && (
        <div className="text-center text-red-400 text-sm font-medium py-2 bg-red-500/10 rounded-lg border border-red-500/20">
          Insufficient balance to place trades
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'confirming' && pendingSide ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="text-center space-y-2">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                pendingSide === 'long' 
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {pendingSide === 'long' ? (
                  <Flame className="w-5 h-5" />
                ) : (
                  <Snowflake className="w-5 h-5" />
                )}
                <span className="font-bold">
                  {pendingSide === 'long' ? 'GO HOT' : 'GO COLD'}
                </span>
              </div>
              <h3 className={`font-display font-bold text-xl ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>Confirm Trade</h3>
            </div>

              <div className={`rounded-xl p-4 space-y-3 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Position Size</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>${tradeSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Entry (Live Projection)</span>
                  <span className={`font-mono ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>{currentTemp.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Leverage</span>
                  <span className="font-mono text-yellow-400">100x</span>
                </div>
                <div className={`border-t pt-3 flex justify-between text-sm ${isDark ? 'border-[#27272a]' : 'border-gray-200'}`}>
                  <span className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Max Potential</span>
                  <span className="font-mono text-emerald-400">+${potentialPnl.toFixed(2)}/pt</span>
                </div>
              </div>


            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={cancelTrade}
                className={`h-12 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Cancel
              </Button>
              <Button
                onClick={executeTrade}
                className={`h-12 font-bold ${
                  pendingSide === 'long'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
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
            className="py-8 text-center"
          >
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-3" />
            <p className={isDark ? 'text-zinc-400' : 'text-gray-500'}>Processing trade...</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Trade Size</span>
              <span className={`font-display font-bold text-2xl ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>${tradeSize}</span>
            </div>

            <Slider
              value={[tradeSize]}
              onValueChange={([v]) => setTradeSize(v)}
              min={5}
              max={Math.max(5, maxTrade)}
              step={5}
              className="py-4"
              disabled={balance <= 0}
            />

            <div className={`flex justify-between text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              <span>$5</span>
              <span className={isDark ? 'text-zinc-400' : 'text-gray-600'}>Virtual Coins</span>
              <span>${maxTrade > 0 ? maxTrade : 0}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                <Button
                  onClick={() => initiateConfirm('long')}
                  disabled={disabled || !canTrade}
                  className="w-full h-16 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-display font-bold text-lg rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  <Flame className="w-5 h-5 mr-2" />
                  GO HOT
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
                <Button
                  onClick={() => initiateConfirm('short')}
                  disabled={disabled || !canTrade}
                  className="w-full h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-display font-bold text-lg rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <Snowflake className="w-5 h-5 mr-2" />
                  GO COLD
                </Button>
              </motion.div>
            </div>

              <div className={`text-center text-xs ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                Live Projection: <span className={`font-mono ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{currentTemp.toFixed(2)}</span>
                <span className="mx-2">•</span>
                <span className="text-yellow-400">100x Leverage</span>
              </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}