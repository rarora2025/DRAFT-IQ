'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, History, Flame, Snowflake, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useProjection } from '@/hooks/useProjection'
import { supabase } from '@/lib/supabase'
import type { Position, Trade } from '@/lib/types'

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const { temperature } = useProjection()
  const [positions, setPositions] = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      const [openRes, closedRes, tradesRes] = await Promise.all([
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
          .limit(20),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (openRes.data) {
        setPositions(openRes.data.map(p => ({
          ...p,
          size: Number(p.size),
          entry_price: Number(p.entry_price),
          exit_price: p.exit_price ? Number(p.exit_price) : null,
          realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
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

      setLoading(false)
    }

    fetchData()
  }, [user?.id])

  const unrealizedPnl = useMemo(() => {
    return positions.reduce((total, pos) => {
      const diff = temperature - pos.entry_price
      const pnl = pos.side === 'long' ? diff * pos.size : -diff * pos.size
      return total + pnl
    }, 0)
  }, [positions, temperature])

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-emerald-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="font-display font-bold text-2xl">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Track your performance</p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="font-display font-bold text-3xl">${totalValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className="font-display font-semibold">${profile?.balance.toFixed(2)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">Unrealized</p>
              <p className={`font-display font-semibold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xs text-muted-foreground mb-1">Realized</p>
              <p className={`font-display font-semibold ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Open Positions ({positions.length})
            </h2>
            {positions.map((pos) => {
              const diff = temperature - pos.entry_price
              const pnl = pos.side === 'long' ? diff * pos.size : -diff * pos.size
              const isProfit = pnl >= 0
              
              return (
                <div key={pos.id} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {pos.side === 'long' ? (
                        <Flame className="w-5 h-5 text-orange-400" />
                      ) : (
                        <Snowflake className="w-5 h-5 text-blue-400" />
                      )}
                      <div>
                        <span className={`font-display font-bold ${pos.side === 'long' ? 'text-orange-400' : 'text-blue-400'}`}>
                          {pos.side === 'long' ? 'HOT' : 'COLD'}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">${pos.size}</span>
                        <p className="text-xs text-muted-foreground">Entry: {pos.entry_price.toFixed(2)}°F</p>
                      </div>
                    </div>
                    <div className={`text-right font-display font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{pnl.toFixed(2)}
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Trade History
          </h2>
          
          {trades.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-muted-foreground">
              No trades yet. Start trading to see your history!
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div key={trade.id} className="glass rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        trade.action === 'buy' ? 'bg-orange-500/20 text-orange-400' :
                        trade.action === 'sell' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {trade.action.toUpperCase()}
                      </span>
                      <span className="text-sm">${trade.size} @ {trade.price.toFixed(2)}°F</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <Navbar />
    </div>
  )
}
