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
  Clock,
  Share2,
  Check
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

    const COIN_LOGO_URL = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/200e45b4-6171-4b26-b381-aa6678867b18/ChatGPT-Image-Feb-1-2026-1769997817075.png?width=8000&height=8000&resize=contain";

  function DisplayNumber({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
    const safeValue = typeof value === 'number' ? value : 0;
    return (
      <span className="flex items-center gap-2">
        {safeValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix && <span className="text-primary">{suffix}</span>}
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
  const { updateDailyStartValue } = useProfile(user?.id)
  const { closePosition } = usePositions(user?.id)
  const { queuedTrades, cancelQueuedTrade, refetch: refetchQueuedTrades } = useQueuedTrades(user?.id)
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [showClosedPositions, setShowClosedPositions] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const { theme } = useTheme()

  const [showShareModal, setShowShareModal] = useState(false)
  const [sharingPosition, setSharingPosition] = useState<any>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [sharing, setSharing] = useState(false)

  const pendingOpenTrades = queuedTrades.filter(t => t.trade_type === 'open')

    useEffect(() => {
      if (profile && total_portfolio_value > 0 && !vaultLoading) {
        const lastReset = (profile as any).last_reset_at ? new Date((profile as any).last_reset_at) : new Date(0)
        const now = new Date()
        const isDifferentDay = lastReset.getDate() !== now.getDate() || 
                               lastReset.getMonth() !== now.getMonth() || 
                               lastReset.getFullYear() !== now.getFullYear()

        if (!profile.daily_start_value || isDifferentDay) {
          updateDailyStartValue(total_portfolio_value)
        }
      }
    }, [profile, total_portfolio_value, updateDailyStartValue, vaultLoading])

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

  const handleShareTrade = async () => {
    if (!sharingPosition || sharing) return
    setSharing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          type: 'share_trade', 
          position_id: sharingPosition.id,
          caption: shareCaption.trim() || null
        })
      })

      if (response.ok) {
        setShowShareModal(false)
        setSharingPosition(null)
        setShareCaption('')
        alert("Trade shared to community!")
      } else {
        alert("Failed to share trade")
      }
    } catch (error) {
      console.error('Error sharing trade:', error)
    } finally {
      setSharing(false)
    }
  }

  const dailyChange = useMemo(() => {
    if (!profile?.daily_start_value || profile.daily_start_value === 0) return { amount: 0, percent: 0 }
    const amount = total_portfolio_value - profile.daily_start_value
    const percent = (amount / profile.daily_start_value) * 100
    return { amount, percent }
  }, [total_portfolio_value, profile?.daily_start_value])

  if (authLoading || vaultLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing your portfolio...</p>
      </div>
    )
  }

    return (
      <div className="min-h-screen bg-[#020420] pb-24 sm:pb-12 text-white selection:bg-primary/30 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:px-8 overflow-x-hidden">

        <div className="space-y-12">
          {/* Metrics Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] p-6 sm:p-10 bg-card border border-white/5 overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -mr-64 -mt-64 transition-all group-hover:bg-primary/10" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-10">
              <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">TOTAL PORTFOLIO VALUE</p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0">
                        <img src={COIN_LOGO_URL} alt="IQ" className="w-full h-full object-contain" />
                      </div>
                      <p className="font-mono font-black text-5xl sm:text-7xl text-white tracking-tighter leading-tight">
                        <DisplayNumber value={total_portfolio_value} suffix="IQ" decimals={0} />
                      </p>
                    </div>
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border h-fit flex items-center gap-2 ${dailyChange.amount >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
                        <span>daily change:</span>
                        <span>{dailyChange.amount >= 0 ? '+' : '-'}{Math.abs(dailyChange.percent).toFixed(2)}%</span>
                      </div>
                  </div>
                </div>
      
                <div className="flex items-center justify-center gap-10 sm:gap-20 pt-10 border-t border-white/5 w-full max-w-2xl">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">AVAILABLE CAPITAL</p>
                    <p className="font-mono font-black text-2xl sm:text-3xl text-white">
                      <DisplayNumber value={cashBalance} suffix="IQ" decimals={0} />
                    </p>
                  </div>
                  <div className="border-l border-white/10 pl-10 sm:pl-20 space-y-1 text-left sm:text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">ACTIVE STAKE</p>
                    <p className={`font-mono font-black text-2xl sm:text-3xl ${positions_value > 0 ? 'text-emerald-400' : 'text-primary'}`}>
                      <DisplayNumber value={positions_value} suffix="IQ" decimals={0} />
                    </p>
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
                    <button 
                      onClick={() => setShowClosedPositions(!showClosedPositions)}
                      className="group flex items-center gap-3"
                    >
                      <History className="w-6 h-6 text-muted-foreground group-hover:text-white transition-colors" />
                      <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight flex items-center gap-2">
                        TRADE HISTORY
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", !showClosedPositions && "-rotate-90")} />
                      </h2>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-500/50" />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{closedPositions.length} TRADES</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showClosedPositions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {closedPositions.length === 0 ? (
                            <div className="col-span-full rounded-3xl p-12 bg-white/[0.02] border border-dashed border-white/10 text-center">
                              <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                              <p className="text-muted-foreground font-medium">No execution history found</p>
                            </div>
                          ) : (
                            closedPositions.map((pos, idx) => {
                              const isProfit = (pos.realized_pnl ?? 0) >= 0
                              const closedDate = pos.closed_at ? new Date(pos.closed_at) : null
                              return (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={pos.id} 
                                    className="rounded-2xl p-4 bg-card/40 border border-white/5 group hover:bg-card hover:border-white/10 transition-all cursor-default flex items-center justify-between gap-3 overflow-hidden"
                                  >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110 ${pos.side === 'long' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                      {pos.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-black text-white truncate uppercase tracking-tight leading-tight">{pos.market_title || 'NBA Market'}</span>
                                      <div className="flex items-center gap-1.5 overflow-hidden mt-0.5">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] whitespace-nowrap">${pos.size.toFixed(2)}</span>
                                        <div className="w-0.5 h-0.5 rounded-full bg-white/10 shrink-0" />
                                        <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">
                                          {(pos.entry_reference_value ?? pos.entry_price).toFixed(1)} → {(pos.exit_reference_value ?? pos.exit_price ?? (pos.entry_reference_value ?? pos.entry_price)).toFixed(1)}
                                        </span>
                                      </div>
                                      {closedDate && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Clock className="w-2.5 h-2.5 text-zinc-600" />
                                          <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                                            Ended {closedDate.toLocaleDateString()} {closedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button 
                                      onClick={() => {
                                        setSharingPosition(pos)
                                        setShowShareModal(true)
                                      }}
                                      className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-zinc-600 hover:text-primary"
                                      title="Share trade"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                    <div className="text-right">
                                      <span className={`font-mono font-black text-base whitespace-nowrap ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
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
                    )}
                  </AnimatePresence>
                </motion.div>

            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
              onClick={() => {
                setShowShareModal(false)
                setSharingPosition(null)
                setShareCaption('')
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md bg-[#0B1221] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl my-auto"
              >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Share Trade</h2>
                <button 
                  onClick={() => {
                    setShowShareModal(false)
                    setSharingPosition(null)
                    setShareCaption('')
                  }} 
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {sharingPosition && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${sharingPosition.side === 'long' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {sharingPosition.side === 'long' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white uppercase tracking-tight truncate">{sharingPosition.market_title}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        {sharingPosition.side === 'long' ? 'OVER' : 'UNDER'} • ${sharingPosition.size.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Add a message (optional)</label>
                    <textarea
                      value={shareCaption}
                      onChange={(e) => setShareCaption(e.target.value)}
                      placeholder="What's your take on this trade?"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleShareTrade}
                    disabled={sharing}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] py-6 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-95"
                  >
                    {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-5 h-5 mr-2" /> Share to Community</>}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar isDark={true} />
    </div>
  )
}
