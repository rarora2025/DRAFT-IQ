'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { Wallet, Activity, History, Loader2, X, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import type { Position, Trade } from '@/lib/types'

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const spring = useSpring(value, { stiffness: 40, damping: 20 })
  const [display, setDisplay] = useState(value.toFixed(2))

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  useEffect(() => {
    return spring.onChange((v) => setDisplay(v.toFixed(2)))
  }, [spring])

  return (
    <span>
      {prefix}{display}
    </span>
  )
}

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateBalance, updateDailyStartValue } = useProfile(user?.id)
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
      
      // Update balance and positions simultaneously to keep totalValue stable
      await updateBalance(profile.balance + returnAmount)
      setPositions(prev => prev.filter(p => p.id !== pos.id))
      setClosedPositions(prev => [{
        ...pos,
        closed_at: new Date().toISOString(),
        exit_price: currentPrice,
        realized_pnl: pnl
      }, ...prev])
      
      await fetchData()
    } finally {
      setClosingId(null)
    }
  }

  const unrealizedPnl = useMemo(() => {
    return positions
      .reduce((total, pos) => {
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
    const investedAmount = positions
      .reduce((total, pos) => total + pos.size, 0)
    return (profile?.balance ?? 0) + investedAmount + unrealizedPnl
  }, [profile?.balance, positions, unrealizedPnl])

  // Reset daily value logic
  useEffect(() => {
    if (!profile || totalValue === 0 || loading) return

    const now = new Date()
    const lastReset = profile.last_reset_at ? new Date(profile.last_reset_at) : null
    
    // Check if we need to reset (first time or different day)
    const needsReset = !lastReset || 
      lastReset.getDate() !== now.getDate() || 
      lastReset.getMonth() !== now.getMonth() || 
      lastReset.getFullYear() !== now.getFullYear()

    if (needsReset) {
      updateDailyStartValue(totalValue)
    }
  }, [profile, totalValue, loading, updateDailyStartValue])

  const dailyChange = useMemo(() => {
    if (!profile?.daily_start_value || profile.daily_start_value === 0) return { amount: 0, percent: 0 }
    const amount = totalValue - profile.daily_start_value
    const percent = (amount / profile.daily_start_value) * 100
    return { amount, percent }
  }, [totalValue, profile?.daily_start_value])

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Syncing Vault...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
              My <span className="text-primary italic">Vault</span>
            </h1>
            <p className="text-muted-foreground mt-1">Live performance & active trades</p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 bg-card border border-border overflow-hidden relative group"
        >
            {/* Background Gradient Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <Wallet className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Portfolio Value</p>
                    <p className="font-mono font-bold text-3xl sm:text-4xl text-white">
                      <AnimatedNumber value={totalValue} prefix="$" />
                    </p>
                  </div>
                </div>
                <div className="text-right p-2 rounded-xl bg-accent/30 border border-border">
                  <p className={`text-sm font-bold flex items-center justify-end gap-1 ${dailyChange.amount >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {dailyChange.amount >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {dailyChange.percent.toFixed(2)}%
                  </p>
                  <p className={`text-[10px] font-mono tracking-wider font-bold ${dailyChange.amount >= 0 ? 'text-primary/70' : 'text-red-500/70'}`}>
                    {dailyChange.amount >= 0 ? '+' : ''}${Math.abs(dailyChange.amount).toFixed(2)} TODAY
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl bg-background border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Balance</p>
                  <p className="font-mono font-semibold text-white">
                    <AnimatedNumber value={profile?.balance || 0} prefix="$" />
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-background border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Unrealized</p>
                  <p className={`font-mono font-semibold ${unrealizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    <AnimatedNumber value={unrealizedPnl} prefix={unrealizedPnl >= 0 ? '+' : ''} />
                  </p>
                </div>
                <div className="text-center p-4 rounded-xl bg-background border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Realized</p>
                  <p className={`font-mono font-semibold ${realizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    <AnimatedNumber value={realizedPnl} prefix={realizedPnl >= 0 ? '+' : ''} />
                  </p>
                </div>
              </div>
            </div>
        </motion.div>

        {positions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <h2 className="font-display font-bold text-xl flex items-center gap-3 text-white">
              <div className="w-2 h-8 bg-primary rounded-full" />
              Active Positions ({positions.length})
            </h2>
            <AnimatePresence>
                  {positions.map((pos) => {
                    const liveProp = liveProps.find(p => p.id === pos.market_id)
                    const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
                    const diff = currentPrice - pos.entry_price
                    const percentChange = diff / pos.entry_price
                    const pnl = pos.side === 'long'
                      ? pos.size * percentChange
                      : -pos.size * percentChange
                    const isProfit = pnl >= 0
                    const isClosing = closingId === pos.id

                
                return (
                  <motion.div
                    key={pos.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-2xl p-5 bg-card border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${pos.side === 'long' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {pos.side === 'long' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-display font-black text-sm uppercase tracking-tighter ${pos.side === 'long' ? 'text-orange-400' : 'text-blue-400'}`}>
                                {pos.side === 'long' ? 'HIGHER' : 'LOWER'}
                              </span>
                              <span className="text-sm font-bold text-white">{pos.market_title || 'NBA Prop'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(pos.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClosePosition(pos)}
                          disabled={isClosing}
                          className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all disabled:opacity-50"
                        >
                          {isClosing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-5 border-t border-border">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stake & Entry</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Invested:</span>
                            <span className="font-mono font-bold text-white">${pos.size.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Entry/Now:</span>
                            <span className="font-mono font-bold text-white tracking-tighter">{pos.entry_price.toFixed(1)} / {currentPrice.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Performance</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Net P&L:</span>
                            <span className={`font-mono font-bold ${isProfit ? 'text-primary' : 'text-red-400'}`}>
                              {isProfit ? '+' : ''}${pnl.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Return:</span>
                            <span className={`font-mono font-bold ${isProfit ? 'text-primary' : 'text-red-400'}`}>
                              {isProfit ? '+' : ''}{((pnl / pos.size) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
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
            className="space-y-4"
          >
            <button
              onClick={() => setShowClosedPositions(!showClosedPositions)}
              className="w-full flex items-center justify-between py-3 px-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <h2 className="font-display font-bold text-xl flex items-center gap-3 text-white">
                <History className="w-6 h-6 text-muted-foreground" />
                Trading History ({closedPositions.length})
              </h2>
              {showClosedPositions ? (
                <ChevronUp className="w-6 h-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-6 h-6 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {showClosedPositions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden px-1"
                >
                  {closedPositions.map((pos) => {
                    const isProfit = (pos.realized_pnl ?? 0) >= 0
                    return (
                      <div key={pos.id} className="rounded-2xl p-4 bg-card/50 border border-border group hover:bg-card transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${pos.side === 'long' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {pos.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{pos.market_title || 'NBA Prop'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">${pos.size} Position</span>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-xs text-muted-foreground font-mono">
                                  {pos.entry_price.toFixed(1)} → {pos.exit_price?.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-bold text-base ${isProfit ? 'text-primary' : 'text-red-400'}`}>
                              {isProfit ? '+' : ''}{pos.realized_pnl?.toFixed(2)}
                            </span>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">Realized</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        </div>
  
        <Navbar isDark={true} />
      </div>
    )
  }
