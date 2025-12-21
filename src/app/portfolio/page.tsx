'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Activity, History, Loader2, X, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import type { Position, Trade } from '@/lib/types'

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateBalance } = useProfile(user?.id)
  const [positions, setPositions] = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [liveProps, setLiveProps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showClosedPositions, setShowClosedPositions] = useState(false)
  const { theme } = useTheme()
  const isDark = true

  const fetchData = useCallback(async () => {
    if (!user?.id) return

    try {
      // Fetch data without restrictive limits for counts, 
      // but maybe keep a reasonable limit for performance if needed.
      // However, for counts to be accurate, we should ideally fetch the count separately.
      const [openRes, closedRes, tradesRes, propsRes] = await Promise.all([
        supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .is('closed_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .not('closed_at', 'is', null)
          .order('closed_at', { ascending: false })
          .limit(100), // Increased limit for better visibility
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100), // Increased limit
        fetch('/api/games').then(res => res.json()).then(async (data) => {
          const games = data.games || []
          const allProps = await Promise.all(
            games.map((g: any) => fetch(`/api/games/${g.id}/props`).then(res => res.json()))
          )
          return allProps.flatMap(res => res.props || [])
        })
      ])

      if (openRes.data) {
        setPositions(openRes.data.map(p => ({
          ...p,
          size: Number(p.size),
          entry_price: Number(p.entry_price),
          exit_price: p.exit_price ? Number(p.exit_price) : null,
          realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
          market_id: p.market_ticker || p.player_prop_id
        })))
      }

      if (closedRes.data) {
        setClosedPositions(closedRes.data.map(p => ({
          ...p,
          size: Number(p.size),
          entry_price: Number(p.entry_price),
          exit_price: p.exit_price ? Number(p.exit_price) : null,
          realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
        })))
      }

      if (tradesRes.data) {
        setTrades(tradesRes.data.map(t => ({
          ...t,
          size: Number(t.size),
          price: Number(t.price),
        })))
      }

      if (propsRes) {
        setLiveProps(propsRes)
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleClosePosition = async (pos: Position) => {
    if (!profile || closingId) return
    
    const liveProp = liveProps.find(p => p.id === pos.market_id)
    const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
    
    setClosingId(pos.id)
      try {
        const priceDiff = currentPrice - pos.entry_price
        const percentChange = priceDiff / pos.entry_price
        const pnl = pos.side === 'long'
          ? pos.size * percentChange
          : -pos.size * percentChange

        await supabase
          .from('positions')
        .update({
          closed_at: new Date().toISOString(),
          exit_price: currentPrice,
          realized_pnl: pnl,
        })
        .eq('id', pos.id)

      await supabase.from('trades').insert({
        user_id: user!.id,
        position_id: pos.id,
        action: 'close',
        size: pos.size,
        price: currentPrice,
        market_title: pos.market_title // Added market_title to trade history
      })

      const returnAmount = Math.max(0, pos.size + pnl)
      await updateBalance(profile.balance + returnAmount)
      await fetchData()
    } finally {
      setClosingId(null)
    }
  }

  const unrealizedPnl = useMemo(() => {
    return positions.reduce((total, pos) => {
      const liveProp = liveProps.find(p => p.id === pos.market_id)
      if (!liveProp) return total
      
      const currentPrice = liveProp.current_value || liveProp.line
      const diff = currentPrice - pos.entry_price
        const percentChange = diff / pos.entry_price
        const pnl = pos.side === 'long'
          ? pos.size * percentChange
          : -pos.size * percentChange
      return total + pnl
    }, 0)
  }, [positions, liveProps])

  const realizedPnl = useMemo(() => {
    return closedPositions.reduce((total, pos) => {
      return total + (pos.realized_pnl ?? 0)
    }, 0)
  }, [closedPositions])

  const totalValue = useMemo(() => {
    return (profile?.balance ?? 0) + unrealizedPnl
  }, [profile?.balance, unrealizedPnl])

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-sm text-zinc-500">Syncing Portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-zinc-100">Portfolio</h1>
            <p className="text-sm text-zinc-500">NBA Live Trading</p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 bg-[#111116] border border-[#27272a]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Portfolio Value</p>
              <p className="font-mono font-bold text-3xl text-zinc-100">${totalValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-[#0a0a0f]">
              <p className="text-xs mb-1 text-zinc-500">Balance</p>
              <p className="font-mono font-semibold text-zinc-200">${profile?.balance.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-[#0a0a0f]">
              <p className="text-xs mb-1 text-zinc-500">Unrealized</p>
              <p className={`font-mono font-semibold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-[#0a0a0f]">
              <p className="text-xs mb-1 text-zinc-500">Realized</p>
              <p className={`font-mono font-semibold ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {realizedPnl >= 0 ? '+' : ''}{realizedPnl.toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>

        {positions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 text-zinc-200">
              <Activity className="w-5 h-5 text-emerald-400" />
              Open Positions ({positions.length})
            </h2>
            <AnimatePresence>
                {positions.map((pos) => {
                  const liveProp = liveProps.find(p => p.id === pos.market_id)
                  const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
                  const diff = currentPrice - pos.entry_price
                  const pnl = pos.side === 'long'
                    ? pos.size * diff
                    : pos.size * (pos.entry_price - currentPrice)
                  const isProfit = pnl >= 0
                  const isClosing = closingId === pos.id
                
                return (
                  <motion.div
                    key={pos.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl p-4 bg-[#111116] border border-[#27272a]"
                  >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${pos.side === 'long' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {pos.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-display font-bold ${pos.side === 'long' ? 'text-orange-400' : 'text-blue-400'}`}>
                                {pos.side === 'long' ? 'HIGH' : 'LOW'}
                              </span>
                            <span className="text-sm text-zinc-200">{pos.market_title || 'NBA Prop'}</span>
                          </div>
                          <p className="text-xs text-zinc-500">Entry: {pos.entry_price.toFixed(1)} • Current: {currentPrice.toFixed(1)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-right font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{pnl.toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleClosePosition(pos)}
                          disabled={isClosing}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                        >
                          {isClosing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {closedPositions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <button
              onClick={() => setShowClosedPositions(!showClosedPositions)}
              className="w-full flex items-center justify-between py-2"
            >
              <h2 className="font-display font-semibold text-lg flex items-center gap-2 text-zinc-200">
                <History className="w-5 h-5 text-zinc-400" />
                Closed Positions ({closedPositions.length})
              </h2>
              {showClosedPositions ? (
                <ChevronUp className="w-5 h-5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-400" />
              )}
            </button>

            <AnimatePresence>
              {showClosedPositions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {closedPositions.map((pos) => {
                    const isProfit = (pos.realized_pnl ?? 0) >= 0
                    return (
                      <div key={pos.id} className="rounded-xl p-3 bg-[#111116] border border-[#27272a]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {pos.side === 'long' ? (
                                <ArrowUpCircle className="w-4 h-4 text-orange-400/50" />
                              ) : (
                                <ArrowDownCircle className="w-4 h-4 text-blue-400/50" />
                              )}
                            <div className="flex flex-col">
                              <span className="text-sm text-zinc-200">{pos.market_title || 'NBA Prop'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">${pos.size}</span>
                                <span className="text-xs text-zinc-600">
                                  {pos.entry_price.toFixed(1)} → {pos.exit_price?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`font-mono text-sm ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : ''}{pos.realized_pnl?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between py-2"
          >
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 text-zinc-200">
              <Activity className="w-5 h-5 text-emerald-400" />
              Trade History ({trades.length})
            </h2>
            {showHistory ? (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {trades.length === 0 ? (
                  <div className="rounded-xl p-8 text-center bg-[#111116] border border-[#27272a] text-zinc-500">
                    No trades yet. Start trading to see your history!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trades.map((trade) => (
                      <div key={trade.id} className="rounded-xl p-3 bg-[#111116] border border-[#27272a]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              trade.action === 'buy' ? 'bg-orange-500/20 text-orange-400' :
                              trade.action === 'sell' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {trade.action.toUpperCase()}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-zinc-200">{trade.market_title || 'NBA Prop'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-zinc-400">${trade.size}</span>
                                <span className="text-xs text-zinc-500">@ {trade.price.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-zinc-600">
                            {new Date(trade.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
