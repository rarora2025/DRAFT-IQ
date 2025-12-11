'use client'

import { motion } from 'framer-motion'
import { Clock, TrendingUp, BarChart3 } from 'lucide-react'
import type { KalshiMarket } from '@/lib/kalshi'
import { formatVolume, getTimeRemaining } from '@/lib/kalshi'

interface LiveMarketCardProps {
  market: KalshiMarket
  onTrade: (market: KalshiMarket) => void
  index?: number
}

export function LiveMarketCard({ market, onTrade, index = 0 }: LiveMarketCardProps) {
  const yesPrice = market.yes_ask || market.last_price || 50
  const noPrice = market.no_ask || (100 - (market.last_price || 50))
  const timeLeft = getTimeRemaining(market.expiration_time)
  const volume = formatVolume(market.volume || 0)
  const isUrgent = timeLeft.includes('m') && !timeLeft.includes('d')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#58a6ff] transition-all cursor-pointer"
      onClick={() => onTrade(market)}
    >
      <div className="flex flex-col h-full min-h-[180px]">
        <div className="flex-1">
          <h3 className="font-semibold text-[15px] leading-snug text-white line-clamp-2 mb-2 group-hover:text-[#58a6ff] transition-colors">
            {market.title}
          </h3>
          {market.subtitle && (
            <p className="text-xs text-gray-500 line-clamp-1 mb-3">{market.subtitle}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">{yesPrice}¢</span>
            <span className="text-xs text-gray-400 bg-[#21262d] px-2 py-1 rounded-md">
              {market.category || 'Market'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onTrade(market); }}
              className="flex-1 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-sm font-semibold transition-colors"
            >
              Yes {yesPrice}¢
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTrade(market); }}
              className="flex-1 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-sm font-semibold transition-colors"
            >
              No {noPrice}¢
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-[#30363d]">
            <div className="flex items-center gap-1">
              <BarChart3 size={12} />
              <span>{volume}</span>
            </div>
            <div className={`flex items-center gap-1 ${isUrgent ? 'text-orange-400' : ''}`}>
              <Clock size={12} />
              <span>{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
