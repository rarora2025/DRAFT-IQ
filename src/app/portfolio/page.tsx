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
  Share2 
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
import type { Position, Trade } from '@/lib/types'

function DisplayNumber({ value, prefix = "", decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  return (
    <span>
      {prefix}{value.toFixed(decimals)}
    </span>
  )
}

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
    const { 
      profile, 
      positions: activePositions, 
      total_portfolio_value,
      balance: cashBalance,
      positions_value,
      unrealized_pnl: totalUnrealizedPnl,
      loading: vaultLoading, 
      refetch: refetchVault 
    } = useVault(user?.id)
  const { updateDailyStartValue } = useProfile(user?.id)
  const { closePosition } = usePositions(user?.id)
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [showClosedPositions, setShowClosedPositions] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [updating, setUpdating] = useState(false)
  const { theme } = useTheme()

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
          .limit(100)

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
      setShowClosedPositions(true)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
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
              My <span className="text-primary italic">Balance</span>
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

          <div className="rounded-3xl p-8 bg-card border border-border overflow-hidden relative group">
              {/* Background Gradient Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
              
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                        <Wallet className="w-8 h-8 text-primary" />
                      </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Vault Value</p>
                                <p className="font-mono font-bold text-4xl sm:text-6xl text-white truncate tracking-tighter">
                                  <DisplayNumber value={total_portfolio_value} prefix="$" />
                                </p>
                            </div>
                        </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-3xl bg-background/50 border border-border/50 backdrop-blur-sm">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 pl-1">Cash Balance</p>
                          <p className="font-mono font-bold text-xl text-white">
                            <DisplayNumber value={cashBalance} prefix="$" />
                          </p>
                        </div>
                          <div className="p-4 rounded-3xl bg-background/50 border border-border/50 backdrop-blur-sm">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 pl-1">In Positions</p>
                              <p className="font-mono font-bold text-xl text-[#00FF00]">
                                <DisplayNumber value={positions_value} prefix="$" />
                              </p>
                            </div>
                        </div>

                          <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-6">
                              <div className="flex flex-col min-w-0">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                          <div className={`w-1 h-1 rounded-full ${overallReturn >= 0 ? 'bg-[#00FF00]' : 'bg-red-400'}`} />
                                          Total Return
                                        </p>
                                          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                                            <span className={`font-mono font-bold text-lg sm:text-xl truncate ${overallReturn >= 0 ? 'text-[#00FF00]' : 'text-red-400'}`}>
                                              {overallReturn >= 0 ? '+' : '-'}${Math.abs(overallReturn).toFixed(1)}
                                            </span>
                                          </div>
                                      </div>

                                        <div className="flex flex-col border-l border-border/30 pl-4 min-w-0">
                                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <div className={`w-1 h-1 rounded-full ${dailyChange.amount >= 0 ? 'bg-[#00FF00]' : 'bg-red-400'}`} />
                                            Daily Change
                                          </p>
                                          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                                            <span className={`font-mono font-bold text-lg sm:text-xl truncate ${dailyChange.amount >= 0 ? 'text-[#00FF00]' : 'text-red-400'}`}>
                                              {dailyChange.amount >= 0 ? '+' : '-'}${Math.abs(dailyChange.amount).toFixed(1)}
                                            </span>
                                          </div>
                              </div>
                        </div>
                  </div>

          </div>

            {activePositions.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-xl flex items-center gap-3 text-white">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  Active Trades ({activePositions.length})
                </h2>
                  <div className="rounded-3xl p-6 bg-card border border-border overflow-hidden relative group">
                    {/* Background Gradient Effect - Mirror of Vault Card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                    
                    <div className="relative z-10 space-y-3">
                          {activePositions.map((pos) => {
                            return (
                              <PositionCard
                                key={pos.id}
                                position={pos}
                                currentTemp={(pos as any).current_price || pos.entry_price}
                                onClose={handleClosePosition}
                                onPriceCheck={() => handlePriceCheck(pos.market_id)}
                                loading={closingId === pos.id}
                                isDark={true}
                              />
                            )
                          })}
                    </div>
                  </div>
              </div>
            )}


          {closedPositions.length > 0 && (
            <div className="space-y-4">
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
                                      <span className={`font-mono font-bold text-base ${isProfit ? 'text-[#00FF00]' : 'text-red-400'}`}>
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
            </div>
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
