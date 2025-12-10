'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Snowflake, Loader2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface TradePanelProps {
  balance: number
  currentTemp: number
  onTrade: (side: 'long' | 'short', size: number) => Promise<void>
  disabled?: boolean
}

export function TradePanel({ balance, currentTemp, onTrade, disabled }: TradePanelProps) {
  const [tradeSize, setTradeSize] = useState(50)
  const [loading, setLoading] = useState<'long' | 'short' | null>(null)

  const maxTrade = Math.max(0, Math.min(balance, 500))
  const canTrade = balance > 0 && tradeSize > 0 && tradeSize <= balance

  useEffect(() => {
    if (tradeSize > maxTrade) {
      setTradeSize(Math.max(5, maxTrade))
    }
  }, [balance, maxTrade, tradeSize])

  const handleTrade = async (side: 'long' | 'short') => {
    if (loading || disabled || !canTrade) return
    setLoading(side)
    try {
      await onTrade(side, tradeSize)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      {balance <= 0 && (
        <div className="text-center text-red-400 text-sm font-medium py-2 bg-red-500/10 rounded-lg">
          Insufficient balance to place trades
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Trade Size</span>
        <span className="font-display font-bold text-xl">${tradeSize}</span>
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

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>$5</span>
        <span>${maxTrade > 0 ? maxTrade : 0}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
          <Button
            onClick={() => handleTrade('long')}
            disabled={loading !== null || disabled || !canTrade}
            className="w-full h-16 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-display font-bold text-lg rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
          >
            {loading === 'long' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Flame className="w-5 h-5 mr-2" />
                GO HOT
              </>
            )}
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: canTrade ? 1.02 : 1 }} whileTap={{ scale: canTrade ? 0.98 : 1 }}>
          <Button
            onClick={() => handleTrade('short')}
            disabled={loading !== null || disabled || !canTrade}
            className="w-full h-16 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-display font-bold text-lg rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {loading === 'short' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Snowflake className="w-5 h-5 mr-2" />
                GO COLD
              </>
            )}
          </Button>
        </motion.div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Entry price: <span className="text-foreground font-semibold">{currentTemp.toFixed(2)}°F</span>
      </div>
    </div>
  )
}