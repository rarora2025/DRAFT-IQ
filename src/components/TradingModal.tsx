'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { KalshiMarket } from '@/lib/kalshi'

interface TradingModalProps {
  market: KalshiMarket | null
  onClose: () => void
  balance: number
  onTrade: (market: KalshiMarket, side: 'yes' | 'no', contracts: number, price: number) => Promise<void>
}

export function TradingModal({ market, onClose, balance, onTrade }: TradingModalProps) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [contracts, setContracts] = useState(10)
  const [loading, setLoading] = useState(false)

  if (!market) return null

  const price = side === 'yes' ? (market.yes_ask || market.last_price) : (market.no_ask || (100 - market.last_price))
  const cost = (contracts * price) / 100
  const potentialProfit = contracts - cost
  const maxContracts = Math.floor((balance * 100) / price)

  const handleTrade = async () => {
    if (loading || cost > balance) return
    setLoading(true)
    try {
      await onTrade(market, side, contracts, price)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0d1117] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-5 border-b border-[#30363d]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold text-lg text-white leading-tight">{market.title}</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[#21262d] text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {market.subtitle && (
              <p className="text-sm text-gray-400 mt-1">{market.subtitle}</p>
            )}
          </div>

          <div className="p-5 space-y-5">
            <div className="flex gap-2">
              <button
                onClick={() => setSide('yes')}
                className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all ${
                  side === 'yes'
                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                    : 'bg-[#21262d] text-gray-400 border-2 border-transparent hover:border-[#30363d]'
                }`}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                Yes {market.yes_ask || market.last_price}¢
              </button>
              <button
                onClick={() => setSide('no')}
                className={`flex-1 py-3 rounded-xl font-semibold text-lg transition-all ${
                  side === 'no'
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500'
                    : 'bg-[#21262d] text-gray-400 border-2 border-transparent hover:border-[#30363d]'
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                No {market.no_ask || (100 - market.last_price)}¢
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Contracts</span>
                <span className="font-bold text-xl text-white">{contracts}</span>
              </div>
              <Slider
                value={[contracts]}
                onValueChange={([v]) => setContracts(v)}
                min={1}
                max={Math.max(1, maxContracts)}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 contract</span>
                <span>{maxContracts} max</span>
              </div>
            </div>

            <div className="bg-[#161b22] rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Price per contract</span>
                <span className="text-white font-medium">{price}¢</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total cost</span>
                <span className="text-white font-medium">${cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-[#30363d] pt-3">
                <span className="text-gray-400">Potential profit</span>
                <span className="text-emerald-400 font-bold">+${potentialProfit.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500 bg-[#161b22] rounded-lg p-3">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                If {side === 'yes' ? 'YES' : 'NO'} wins, you get $1 per contract. 
                Max loss: ${cost.toFixed(2)}
              </span>
            </div>

            <Button
              onClick={handleTrade}
              disabled={loading || cost > balance}
              className={`w-full h-14 font-bold text-lg rounded-xl transition-all ${
                side === 'yes'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : cost > balance ? (
                'Insufficient Balance'
              ) : (
                `Buy ${contracts} ${side.toUpperCase()} @ ${price}¢`
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
