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
  const { profile, positions: activePositions, loading: vaultLoading, refetch: refetchVault } = useVault(user?.id)
  const { updateDailyStartValue } = useProfile(user?.id)
  const { closePosition } = usePositions(user?.id)
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
  const { theme } = useTheme()

  const currentBalance = profile?.balance ?? 0

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
      const [closedRes, tradesRes, propsRes] = await Promise.all([
        supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .not('closed_at', 'is', null)
          .order('closed_at', { ascending: false })
          .limit(100),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        fetch('/api/games').then(res => res.json()).then(async (data) => {
          const games = data.games || []
          const allProps = await Promise.all(
            games.map((g: any) => fetch(`/api/games/${g.id}/props`).then(res => res.json()))
          )
          return allProps.flatMap(res => res.props || [])
        })
      ])

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

  const handleClosePosition = async (positionId: string, exitPrice: number) => {
    if (!profile || closingId) return
    
    setClosingId(positionId)
    try {
      const result = await closePosition(positionId, exitPrice)
      console.log('Close position result:', result)
      
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

  const handlePriceCheck = async (marketId: string) => {
    try {
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

  const cashBalance = currentBalance

  const portfolioValue = useMemo(() => {
    return activePositions.reduce((total, pos) => {
      const liveProp = liveProps.find(p => p.id === pos.market_id)
      const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
      
      let percentChange = (currentPrice - pos.entry_price) / pos.entry_price
      if (pos.side === 'short') {
        percentChange = (pos.entry_price - currentPrice) / pos.entry_price
      }
      
      return total + (pos.size * (1 + percentChange))
    }, 0)
  }, [activePositions, liveProps])

  const investedAmount = useMemo(() => {
    return activePositions.reduce((total, pos) => total + pos.size, 0)
  }, [activePositions])

  const totalValue = cashBalance + portfolioValue
  const totalUnrealizedPnl = portfolioValue - investedAmount

  const returnsPercent = useMemo(() => {
    if (investedAmount === 0) return 0
    return (totalUnrealizedPnl / investedAmount) * 100
  }, [totalUnrealizedPnl, investedAmount])

  // Reset daily value logic
  useEffect(() => {
    if (!profile || totalValue === 0 || loading) return

    const now = new Date()
    const lastReset = profile.last_reset_at ? new Date(profile.last_reset_at) : null
    
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


  if (authLoading || vaultLoading || loading) {
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

          <div className="rounded-3xl p-8 bg-card border border-border overflow-hidden relative group">
              {/* Background Gradient Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
              
                <div className="relative z-10 space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                      <Wallet className="w-8 h-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">My Vault (Total Value)</p>
                        <p className="font-mono font-bold text-4xl sm:text-6xl text-white truncate tracking-tighter">
                          <DisplayNumber value={totalValue} prefix="$" />
                        </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 rounded-3xl bg-background border border-border/50 group/item hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Total Returns
                          </p>
                          <p className={`font-mono font-bold text-3xl ${totalUnrealizedPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            <DisplayNumber value={totalUnrealizedPnl} prefix={totalUnrealizedPnl >= 0 ? '+$' : '-$'} />
                          </p>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold ${totalUnrealizedPnl >= 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'}`}>
                            {totalUnrealizedPnl >= 0 ? '+' : ''}{returnsPercent.toFixed(2)}%
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2 justify-end">
                            Daily Change
                            <div className={`w-1.5 h-1.5 rounded-full ${dailyChange.amount >= 0 ? 'bg-primary' : 'bg-red-400'}`} />
                          </p>
                          <p className={`font-mono font-bold text-xl ${dailyChange.amount >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            {dailyChange.amount >= 0 ? '+' : '-'}${Math.abs(dailyChange.amount).toFixed(2)}
                          </p>
                          <p className={`text-xs font-bold ${dailyChange.amount >= 0 ? 'text-primary' : 'text-red-400'}`}>
                            {dailyChange.percent >= 0 ? '+' : ''}{dailyChange.percent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buying Power / Cash Section */}
                  <div className="pt-2 flex items-center justify-between border-t border-border/30">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Buying Power</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-white">
                      <DisplayNumber value={cashBalance} prefix="$" />
                    </span>
                  </div>
                </div>
          </div>

          {activePositions.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-xl flex items-center gap-3 text-white">
                <div className="w-2 h-8 bg-primary rounded-full" />
                Active Positions ({activePositions.length})
              </h2>
                <div className="space-y-4">
                      {activePositions.map((pos) => {
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
