'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { 
  Wallet, 
  Activity, 
  History, 
  Loader2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Settings, 
  User, 
  MessageCircle, 
  AlertTriangle, 
  Share2,
  Clock,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from '@/components/Navbar'
import { PositionCard } from '@/components/PositionCard'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'
import { useVault } from '@/hooks/useVault'
import { usePositions } from '@/hooks/usePositions'
import { useQueuedTrades } from '@/hooks/useQueuedTrades'
import { useRouter } from 'next/navigation'
import type { Position, Trade } from '@/lib/types'

function DisplayNumber({ value, prefix = "", decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const safeValue = typeof value === 'number' ? value : 0;
  return (
    <span>
      {prefix}{safeValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
    const { 
      profile, 
      positions: activePositions, 
      total_portfolio_value,
      balance: cashBalance,
      positions_value,
      unrealized_pnl: totalUnrealizedPnl,
      queued_value,
      loading: vaultLoading, 
      refetch: refetchVault 
    } = useVault(user?.id)
  const { updateDailyStartValue, updateDefaultTolerance } = useProfile(user?.id)
  const { closePosition } = usePositions(user?.id)
  const { queuedTrades, cancelQueuedTrade, refetch: refetchQueuedTrades } = useQueuedTrades(user?.id)
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [showClosedPositions, setShowClosedPositions] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [updating, setUpdating] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [tolerance, setTolerance] = useState(5)
  const { theme } = useTheme()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      // Use window.location.href for a full refresh to clear all client state
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/login'
    }
  }

  const pendingOpenTrades = queuedTrades.filter(t => t.trade_type === 'open')

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username || '')
      setTolerance(profile.default_tolerance ?? 5)
    }
  }, [profile])

    const handleUpdateProfile = async () => {
      if (!user?.id || !newUsername) return
      
      const sanitizedUsername = newUsername.trim().substring(0, 12)
      if (!sanitizedUsername) return

      setUpdating(true)
      try {
        // Check if username is already taken by someone else
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', sanitizedUsername)
          .neq('id', user.id)
          .maybeSingle()

        if (existing) {
          throw new Error('Username is already taken')
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            username: sanitizedUsername,
            default_tolerance: tolerance,
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

  const isDark = true

  const fetchData = useCallback(async () => {
    if (!user?.id) return

    try {
      const { data: closedRes } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .not('closed_at', 'is', null)
          .order('closed_at', { ascending: false })
          .limit(1000)

        if (closedRes) {
          setClosedPositions(closedRes.map(p => ({
            ...p,
            size: Number(p.size),
            entry_price: Number(p.entry_price),
            entry_reference_value: p.entry_reference_value ? Number(p.entry_reference_value) : Number(p.entry_price),
            exit_price: p.exit_price ? Number(p.exit_price) : null,
            exit_reference_value: p.exit_reference_value ? Number(p.exit_reference_value) : (p.exit_price ? Number(p.exit_price) : null),
            realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
          })))
        }

    } catch (error) {
      console.error('Error fetching portfolio data:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
      refetchVault()
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchData, refetchVault])

  const handleClosePosition = async (positionId: string, exitPrice: number) => {
    if (!profile || closingId) return
    
    setClosingId(positionId)
    try {
      await closePosition(positionId, exitPrice)
      await Promise.all([
        refetchVault(),
        fetchData()
      ])
    } catch (error: any) {
      console.error('Error closing position:', error)
      alert(error.message || 'Failed to close position')
      fetchData()
    } finally {
      setClosingId(null)
    }
  }

  // Price check for individual position card (uses DB sync)
  const handlePriceCheck = async (marketId: string) => {
    try {
      const res = await fetch(`/api/props/${marketId}`)
      const data = await res.json()
      return {
        price: data.prop?.current_value || data.prop?.line || 0,
        status: data.prop?.status || 'LIVE',
        lastUpdated: data.prop?.updated_at || new Date().toISOString()
      }
    } catch {
      return { price: 0, status: 'inactive', lastUpdated: new Date().toISOString() }
    }
  }

  const overallReturn = useMemo(() => {
    return total_portfolio_value - 1000
  }, [total_portfolio_value])

  const overallReturnPercent = useMemo(() => {
    return (overallReturn / 1000) * 100
  }, [overallReturn])

  // Reset daily value logic
  useEffect(() => {
    if (!profile || total_portfolio_value === 0 || loading) return

    const now = new Date()
    const lastReset = profile.last_reset_at ? new Date(profile.last_reset_at) : null
    
    const needsReset = !lastReset || 
      lastReset.getDate() !== now.getDate() || 
      lastReset.getMonth() !== now.getMonth() || 
      lastReset.getFullYear() !== now.getFullYear()

    if (needsReset) {
      updateDailyStartValue(total_portfolio_value)
    }
  }, [profile, total_portfolio_value, loading, updateDailyStartValue])

  const dailyChange = useMemo(() => {
    if (!profile?.daily_start_value || profile.daily_start_value === 0) return { amount: 0, percent: 0 }
    const amount = total_portfolio_value - profile.daily_start_value
    const percent = (amount / profile.daily_start_value) * 100
    return { amount, percent }
  }, [total_portfolio_value, profile?.daily_start_value])

  if (authLoading || vaultLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    )
  }

return (
<div className="min-h-screen bg-[#020420] pb-24 sm:pb-12 text-white selection:bg-primary/30">
    <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8">
    
    {/* Header Section */}
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-end mb-8 gap-6">

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 w-full sm:w-auto"
      >
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 text-white transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
          <span className="font-black text-xs tracking-widest uppercase relative z-10">Account Settings</span>
        </button>
      </motion.div>
    </header>

    <div className="space-y-12">
      
        {/* Metrics Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] p-6 sm:p-10 bg-card border border-white/5 overflow-hidden relative group"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -mr-64 -mt-64 transition-all group-hover:bg-primary/10" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">TOTAL PORTFOLIO VALUE</p>
                <div className="flex items-baseline gap-4 flex-wrap">
                  <p className="font-mono font-black text-5xl sm:text-7xl text-white tracking-tighter leading-tight">
                    <DisplayNumber value={total_portfolio_value} prefix="$" decimals={2} />
                  </p>
                  <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border h-fit mt-2 ${dailyChange.amount >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {dailyChange.amount >= 0 ? '▲' : '▼'} {Math.abs(dailyChange.percent).toFixed(2)}%
                  </div>
                </div>
              </div>
  
              <div className="flex gap-10 pt-8 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">AVAILABLE CAPITAL</p>
                  <p className="font-mono font-black text-2xl text-white">
                    <DisplayNumber value={cashBalance} prefix="$" decimals={2} />
                  </p>
                </div>
                <div className="border-l border-white/10 pl-10 space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">ACTIVE STAKE</p>
                  <p className={`font-mono font-black text-2xl ${positions_value > 0 ? 'text-emerald-400' : 'text-primary'}`}>
                    <DisplayNumber value={positions_value} prefix="$" decimals={2} />
                  </p>
                </div>
              </div>
            </div>
  
            <div className="flex flex-col md:items-end md:justify-center gap-2 md:text-right md:border-l md:border-white/5 md:pl-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">NET PERFORMANCE</p>
                <h3 className={`font-mono font-black text-5xl sm:text-7xl tracking-tighter leading-none ${overallReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {overallReturn >= 0 ? '+' : '-'}${Math.abs(overallReturn).toFixed(2)}
                </h3>
                <div className="flex items-center md:justify-end gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${overallReturn >= 0 ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${overallReturn >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {overallReturn >= 0 ? 'Total Profit' : 'Total Loss'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-12 space-y-12">
          
          {/* Pending Orders */}
          {pendingOpenTrades.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 px-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-display font-black text-xl text-white uppercase tracking-tight">PENDING ORDERS</h2>
              </div>
              
              <div className="rounded-3xl p-6 bg-amber-500/5 border border-amber-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 space-y-3">
                  {pendingOpenTrades.map((trade) => (
                    <div 
                      key={trade.id} 
                      className="rounded-2xl p-4 bg-[#0a0b1e] border border-amber-500/20 cursor-pointer hover:bg-[#0d0e24] transition-all group/item"
                      onClick={() => {
                        if (trade.game_id && trade.player_prop_id) {
                          router.push(`/markets/${trade.game_id}/${trade.player_prop_id}`)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover/item:scale-105 ${trade.side === 'long' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                            {trade.side === 'long' ? (
                              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                            ) : (
                              <ArrowDownCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-black text-white truncate uppercase tracking-tight">{trade.market_title || 'Queued Order'}</span>
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap">${trade.size} {trade.side === 'long' ? 'OVER' : 'UNDER'}</span>
                              <div className="w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                              <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">@ {trade.submitted_price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCancellingId(trade.id)
                            cancelQueuedTrade(trade.id)
                              .then(() => Promise.all([refetchVault(), refetchQueuedTrades()]))
                              .finally(() => setCancellingId(null))
                          }}
                          disabled={cancellingId === trade.id}
                          className="h-10 w-10 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex-shrink-0 border border-red-500/20 transition-all active:scale-90"
                        >
                          {cancellingId === trade.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Live Trades */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                LIVE TRADES
              </h2>
            </div>
            
            <div className="rounded-3xl p-6 bg-card border border-white/5 relative overflow-hidden group min-h-[200px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32" />
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePositions.length === 0 ? (
                  <div className="col-span-full py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center mx-auto mb-6">
                      <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No active positions</p>
                    <Button 
                      onClick={() => router.push('/markets')}
                      variant="link" 
                      className="mt-4 text-primary font-black uppercase text-[10px] tracking-widest hover:text-emerald-400"
                    >
                      View Markets →
                    </Button>
                  </div>
                ) : (
                  activePositions.map((pos) => (
                    <PositionCard
                      key={pos.id}
                      position={pos}
                      currentTemp={(pos as any).current_price || pos.entry_price}
                      onClose={handleClosePosition}
                      onPriceCheck={() => handlePriceCheck(pos.market_id || pos.player_prop_id || '')}
                      loading={closingId === pos.id}
                      isDark={true}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Trade History */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight flex items-center gap-3">
                <History className="w-6 h-6 text-muted-foreground" />
                TRADE HISTORY
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{closedPositions.length} TRADES</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {closedPositions.length === 0 ? (
                <div className="col-span-full rounded-3xl p-12 bg-white/[0.02] border border-dashed border-white/10 text-center">
                  <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No execution history found</p>
                </div>
              ) : (
                closedPositions.map((pos, idx) => {
                  const isProfit = (pos.realized_pnl ?? 0) >= 0
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      key={pos.id} 
                      className="rounded-2xl p-4 sm:p-5 bg-card/40 border border-white/5 group hover:bg-card hover:border-white/10 transition-all cursor-default"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-5 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110 ${pos.side === 'long' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                            {pos.side === 'long' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-base font-black text-white truncate uppercase tracking-tight">{pos.market_title || 'NBA Market'}</span>
                              <div className="flex items-center gap-2 overflow-hidden mt-0.5">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] whitespace-nowrap">${pos.size.toFixed(2)}</span>
                                <div className="w-1 h-1 rounded-full bg-white/10 shrink-0" />
                                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                                  {(pos.entry_reference_value ?? pos.entry_price).toFixed(2)} → {(pos.exit_reference_value ?? pos.exit_price ?? (pos.entry_reference_value ?? pos.entry_price)).toFixed(2)}
                                </span>
                              </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-mono font-black text-lg sm:text-xl whitespace-nowrap ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isProfit ? '+' : '-'}${Math.abs(pos.realized_pnl ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </div>
    
  {/* Settings Modal - Redesigned */}
  <AnimatePresence>
    {showSettings && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[#020420]/90 backdrop-blur-xl"
        onClick={() => setShowSettings(false)}
      >
        <motion.div
          initial={{ y: 50, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 50, scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-card border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(34,197,94,0.15)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">TERMINAL CONFIG</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Manage your trading account</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                <X className="w-6 h-6 text-muted-foreground group-hover:text-white" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Trading Alias (max 12 chars)</label>
                <div className="relative group">
                  <Input 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.substring(0, 12))}
                    placeholder="Username"
                    maxLength={12}
                    className="h-16 bg-[#020420] border-white/10 text-white text-xl font-bold rounded-2xl px-6 focus:ring-primary focus:border-primary transition-all group-hover:border-white/20"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 rounded-3xl bg-white/5 border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-white uppercase tracking-widest">Execution Tolerance</label>
                  <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">{tolerance}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                  Auto-execute trades if the market line moves within this range of your submitted price. Reduces slippage rejection.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <span className="text-[10px] text-muted-foreground font-black uppercase">Tight</span>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="flex-1 h-2 bg-[#020420] rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(34,197,94,0.5)] [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-[#020420]"
                  />
                  <span className="text-[10px] text-muted-foreground font-black uppercase">Loose</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  asChild
                  className="h-16 rounded-3xl border-white/10 hover:bg-white/5 hover:border-white/20 text-muted-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  <a href="mailto:getdraftiq@gmail.com?subject=Problem Report" target="_blank" rel="noopener noreferrer">
                    <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                    Report Issue
                  </a>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-16 rounded-3xl border-white/10 hover:bg-white/5 hover:border-white/20 text-muted-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  <a href="mailto:getdraftiq@gmail.com?subject=Feature Request" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                    Request Feature
                  </a>
                </Button>
              </div>

              <div className="pt-4 space-y-4">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={updating}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-[#020420] font-black text-xl rounded-3xl shadow-[0_10px_30px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SYNC CHANGES'}
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full h-12 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-400/5 font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Terminate Session
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
)
}
