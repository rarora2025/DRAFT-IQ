'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { Wallet, Activity, History, Loader2, X, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Settings, User, MessageCircle, AlertTriangle, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/Navbar'
import { PositionCard } from '@/components/PositionCard'
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
  const [showSettings, setShowSettings] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [updating, setUpdating] = useState(false)
  const [localBalance, setLocalBalance] = useState<number | null>(null)
  const { theme } = useTheme()

  const currentBalance = localBalance ?? profile?.balance ?? 0

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '')
    }
  }, [profile])

  const handleUpdateProfile = async () => {
    if (!user?.id || !newUsername) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      alert('Profile updated!')
      setShowSettings(false)
      window.location.reload()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleShareTrade = async (pos: Position, currentPrice: number) => {
    const text = `Hey! I just traded ${pos.market_title} at ${pos.entry_price.toFixed(1)} on DraftIQ. Current value: ${currentPrice.toFixed(1)}! 🏈📈`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DraftIQ Trade',
          text: text,
          url: window.location.origin,
        })
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(text)
        alert('Trade message copied to clipboard!')
      } catch (err) {
        console.error('Error copying:', err)
      }
    }
  }
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

    const handleClosePosition = async (pos: Position, exitPrice?: number) => {
      if (!profile || closingId) return
      
      const currentPrice = exitPrice ?? (liveProps.find(p => p.id === pos.market_id)?.current_value || pos.entry_price)
      
      setClosingId(pos.id)
      try {
        const priceDiff = currentPrice - pos.entry_price
        const percentChange = priceDiff / pos.entry_price
        const pnl = pos.side === 'long'
          ? pos.size * percentChange
          : -pos.size * percentChange

        const returnAmount = Math.max(0, pos.size + pnl)
        const nextBalance = currentBalance + returnAmount

        // Optimistic update to prevent value glitch
        setLocalBalance(nextBalance)
        setPositions(prev => prev.filter(p => p.id !== pos.id))

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
          market_title: pos.market_title
        })

        // Redundant updateBalance removed - handled by DB trigger
        // await updateBalance(nextBalance)
        
        setClosedPositions(prev => [{
          ...pos,
          closed_at: new Date().toISOString(),
          exit_price: currentPrice,
          realized_pnl: pnl
        }, ...prev])
        
        await fetchData()
      } catch (error) {
      console.error('Error closing position:', error)
      // Rollback optimistic update if failed
      setLocalBalance(null)
      fetchData()
    } finally {
      setClosingId(null)
    }
  }

  const handlePriceCheck = async (marketId: string) => {
    try {
      // Trigger a sync for the game this prop belongs to if we can find it
      const prop = liveProps.find(p => p.id === marketId)
      if (prop?.game_id) {
        await fetch(`/api/sync?gameId=${prop.game_id}`)
      }
      
      const res = await fetch(`/api/props/${marketId}`)
      const data = await res.json()
      return data.prop?.current_value || data.prop?.line || 0
    } catch {
      return 0
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
    return currentBalance + investedAmount + unrealizedPnl
  }, [currentBalance, positions, unrealizedPnl])

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
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-2xl bg-card border border-border text-muted-foreground hover:text-primary transition-all shadow-lg"
          >
            <Settings className="w-6 h-6" />
          </button>
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
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                      <Wallet className="w-7 h-7 text-primary" />
                    </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Portfolio Value</p>
                        <p className="font-mono font-bold text-3xl sm:text-5xl text-white truncate">
                          <AnimatedNumber value={totalValue} prefix="$" />
                        </p>
                      </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border shrink-0 ${dailyChange.amount >= 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs font-black tracking-tighter leading-none">
                        {dailyChange.percent >= 0 ? '+' : ''}{dailyChange.percent.toFixed(1)}%
                      </span>
                      <span className="text-[8px] font-bold uppercase opacity-70 mt-1">24H</span>
                    </div>
                  </div>
                </div>
  
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 rounded-xl bg-background border border-border/50 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Vault</p>
                    <p className="font-mono font-semibold text-xs sm:text-sm text-white truncate">
                      <AnimatedNumber value={profile?.balance || 0} prefix="$" />
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-background border border-border/50 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Unrealized</p>
                    <p className={`font-mono font-semibold text-xs sm:text-sm truncate ${unrealizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                      <AnimatedNumber value={unrealizedPnl} prefix={unrealizedPnl >= 0 ? '+' : ''} />
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-background border border-border/50 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Realized</p>
                    <p className={`font-mono font-semibold text-xs sm:text-sm truncate ${realizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
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
                      
                        return (
                          <PositionCard
                            key={pos.id}
                            position={pos}
                            currentTemp={currentPrice}
                            onClose={handleClosePosition}
                            onPriceCheck={() => handlePriceCheck(pos.market_id)}
                            loading={closingId === pos.id}
                            isDark={true}
                          />
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
                                {isProfit ? '+' : ''}{(pos.realized_pnl ?? 0).toFixed(2)}
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
    
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-md"
                onClick={() => setShowSettings(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="w-full max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">Settings</h2>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <X className="w-6 h-6 text-muted-foreground" />
                      </button>
                    </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Trading Alias</label>
                          <Input 
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Username"
                            className="h-14 bg-background border-border text-white text-lg font-bold rounded-2xl"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            asChild
                            className="h-14 rounded-2xl border-border hover:bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]"
                          >
                            <a href="mailto:getdraftiq@gmail.com?subject=Problem Report" target="_blank" rel="noopener noreferrer">
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Report Problem
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            asChild
                            className="h-14 rounded-2xl border-border hover:bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px]"
                          >
                            <a href="mailto:getdraftiq@gmail.com?subject=Feature Request" target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Request Feature
                            </a>
                          </Button>
                        </div>

                      <Button
                        onClick={handleUpdateProfile}
                        disabled={updating}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-[#020420] font-black text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SAVE CHANGES'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        <Navbar isDark={true} />
      </div>
    )
  }
