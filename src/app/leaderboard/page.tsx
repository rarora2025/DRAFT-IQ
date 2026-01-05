'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Loader2, Calendar, Gift, CheckCircle, Users, LogOut, Settings, UserPlus, Trash2, ExternalLink } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface ContestUser {
  id: string
  user_id: string
  username: string
  portfolio_value: number
  total_return: number
  daily_return: number
  daily_start_value: number
}

interface DailyWindow {
  id: string
  name: string
  start_time: string
  end_time: string
  prize_description: string | null
  is_locked: boolean
}

interface DailyWinner {
  id: string
  user_id: string
  daily_return: number
  portfolio_value: number
  profiles: { username: string }
  daily_window: { name: string; id: string }
}

interface Contest {
  id: string
  name: string
  status: 'live' | 'completed'
  start_time: string
  end_time: string
  participant_count: number
  daily_windows: DailyWindow[]
  active_window_override_id: string | null
}

const ADMIN_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',') || []

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [leaderboard, setLeaderboard] = useState<{ overall: ContestUser[], today: ContestUser[] }>({ overall: [], today: [] })
  const [dailyWindows, setDailyWindows] = useState<DailyWindow[]>([])
  const [dailyWinners, setDailyWinners] = useState<DailyWinner[]>([])
  const [currentWindow, setCurrentWindow] = useState<DailyWindow | null>(null)
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [prizeInput, setPrizeInput] = useState('')
  const [editingWinnerId, setEditingWinnerId] = useState<string | null>(null)
  const [winnerInput, setWinnerInput] = useState('')
  const [savingData, setSavingData] = useState(false)
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null)

  const isAdmin = user && ADMIN_IDS.includes(user.id)

  const fetchContestData = useCallback(async (windowId?: string) => {
    try {
      const leaderboardUrl = windowId 
        ? `/api/contest/leaderboard?windowId=${windowId}`
        : '/api/contest/leaderboard'

      const [contestRes, leaderboardRes] = await Promise.all([
        fetch('/api/contest'),
        fetch(leaderboardUrl)
      ])
      
      const contestData = await contestRes.json()
      const leaderboardData = await leaderboardRes.json()

      if (contestData.contest) {
        setContest(contestData.contest)
        setDailyWindows(contestData.contest.daily_windows || [])
      }

        if (leaderboardData.overall) {
          setLeaderboard({
            overall: leaderboardData.overall,
            today: leaderboardData.today
          })
          setCurrentWindow(leaderboardData.current_window)
          setActiveWindowId(leaderboardData.active_window_id)
          setDailyWinners(leaderboardData.daily_winners || [])

        
        if (user) {
          const enrolled = leaderboardData.overall.some((p: ContestUser) => p.user_id === user.id)
          setIsEnrolled(enrolled)
        } else {
          setIsEnrolled(false)
        }
      }
    } catch (error) {
      console.error('Error fetching contest data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      fetchContestData(selectedWindowId || undefined)
      const interval = setInterval(() => fetchContestData(selectedWindowId || undefined), 30000)
      return () => clearInterval(interval)
    }
  }, [authLoading, fetchContestData, selectedWindowId])

  const handleJoinContest = async () => {
    if (!user) return
    setJoining(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/contest', {
        method: 'POST',
        headers,
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setIsEnrolled(true)
        fetchContestData()
      }
    } catch (error) {
      console.error('Error joining contest:', error)
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveContest = async () => {
    if (!user || !confirm('Are you sure you want to leave the challenge? You can rejoin later.')) return
    setLeaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/contest', {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setIsEnrolled(false)
        fetchContestData()
      }
    } catch (error) {
      console.error('Error leaving contest:', error)
    } finally {
      setLeaving(false)
    }
  }

  const handleSavePrize = async (windowId: string) => {
    setSavingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/admin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_prize',
          daily_window_id: windowId,
          prize_description: prizeInput
        })
      })
      
      if (response.ok) {
        setEditingPrizeId(null)
        setPrizeInput('')
        fetchContestData()
      }
    } catch (error) {
      console.error('Error saving prize:', error)
    } finally {
      setSavingData(false)
    }
  }

  const handleSetWinner = async (windowId: string) => {
    if (!winnerInput) return
    setSavingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'set_winner',
          window_id: windowId,
          username: winnerInput.trim()
        })
      })
      
      if (response.ok) {
        setEditingWinnerId(null)
        setWinnerInput('')
        
        // Clear active override if this window was the one being simulated
        if (contest?.active_window_override_id === windowId) {
          await handleSetActiveWindow(windowId) // This will toggle it off
        } else {
          fetchContestData()
        }
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to set winner')
      }
    } catch (error) {
      console.error('Error setting winner:', error)
    } finally {
      setSavingData(false)
    }
  }

  const handleRemoveWinner = async (windowId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this winner?')) return
    setSavingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'remove_winner',
          window_id: windowId,
          user_id: userId
        })
      })
      
      if (response.ok) {
        fetchContestData()
      }
    } catch (error) {
      console.error('Error removing winner:', error)
    } finally {
      setSavingData(false)
    }
  }

  const handleSetActiveWindow = async (windowId: string) => {
    if (!isAdmin) return
    
    // Toggle logic: if clicking the current override, clear it
    const newOverrideId = contest?.active_window_override_id === windowId ? null : windowId

    setSavingData(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'set_active_window',
          window_id: newOverrideId
        })
      })
      
      if (response.ok) {
        fetchContestData()
      }
    } catch (error) {
      console.error('Error setting active window:', error)
    } finally {
      setSavingData(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 text-center font-mono text-sm text-zinc-500">{rank}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/20'
    if (rank === 2) return 'bg-zinc-500/10 border-zinc-500/20'
    if (rank === 3) return 'bg-amber-600/10 border-amber-600/20'
    return 'bg-[#111116] border-[#27272a]'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const isContestLive = contest?.status === 'live'

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-6">
        
        <header className="text-center relative">
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tighter uppercase">
            NFL Playoff <span className="text-primary italic">Challenge</span>
          </h1>
          
          {contest && (
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(contest.start_time)} - {formatDate(contest.end_time)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {contest.participant_count} traders
              </span>
            </div>
          )}

          {/* Kalshi Branding */}
          <div className="mt-2 flex flex-col items-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">In collaboration with</p>
            <div className="relative w-20 h-5 mb-1">
              <Image 
                src="/sponsors/kalshi.webp" 
                alt="Kalshi" 
                fill 
                className="object-contain"
              />
            </div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.1em]">Trade on anything at <span className="text-primary/80">kalshi.com</span></p>
          </div>
        </header>

        {isEnrolled === false && user && isContestLive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
          >
            <h3 className="font-display font-bold text-lg text-white mb-2">Join the Challenge</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your current portfolio value becomes your starting point. Trade NFL playoff markets and compete for daily prizes!
            </p>
            <Button
              onClick={handleJoinContest}
              disabled={joining}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Challenge'}
            </Button>
          </motion.div>
        )}

        {!user && (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">Sign in to join the NFL Playoff Challenge</p>
            <Button asChild className="bg-primary">
              <a href="/login">Sign In</a>
            </Button>
          </div>
        )}

        <Tabs defaultValue="overall" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border p-1 rounded-2xl h-14">
            <TabsTrigger 
              value="overall" 
              className="font-display font-bold uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all h-full"
            >
              Overall
            </TabsTrigger>
            <TabsTrigger 
                value="today" 
                className="font-display font-bold uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl transition-all h-full"
              >
                Today
              </TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="mt-6 space-y-4">
            {leaderboard.overall.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
                <Trophy className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No participants yet. Be the first to join!
                </p>
              </div>
            ) : (
              leaderboard.overall.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-2xl p-5 border transition-all hover:bg-card/80 ${getRankBg(index + 1)} ${entry.user_id === user?.id ? 'ring-2 ring-primary shadow-xl shadow-primary/10' : 'bg-card border-border'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border">
                      {getRankIcon(index + 1)}
                    </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-lg text-white">
                          {entry.username}
                          {entry.user_id === user?.id && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded">You</span>
                          )}
                        </p>
                        <div className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider ${entry.daily_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.daily_return >= 0 ? '+' : ''}{entry.daily_return.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Portfolio Value</p>
                        <div className="font-mono font-black text-xl text-white">
                          ${Math.round(entry.portfolio_value).toLocaleString()}
                        </div>
                      </div>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="today" className="mt-6 space-y-4">
            {leaderboard.today.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
                <Trophy className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No participants yet
                </p>
              </div>
            ) : (
              <>
                {activeWindowId && leaderboard.today[0] && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Today's Prize Leader</span>
                  </div>
                )}
                {leaderboard.today.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl p-5 border transition-all hover:bg-card/80 ${getRankBg(index + 1)} ${entry.user_id === user?.id ? 'ring-2 ring-primary shadow-xl shadow-primary/10' : 'bg-card border-border'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-lg text-white">
                          {entry.username}
                          {entry.user_id === user?.id && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary px-1.5 py-0.5 bg-primary/10 rounded">You</span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          ${Math.round(entry.portfolio_value).toLocaleString()} Portfolio
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Today</p>
                        <div className={`flex items-center justify-end gap-1 font-mono font-black text-xl ${entry.daily_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.daily_return >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          {entry.daily_return >= 0 ? '+' : ''}{entry.daily_return.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>

        {dailyWindows.length > 0 && (
          <div className="mt-8 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Playoff Schedule & Prizes
              {isAdmin && <span className="text-[10px] text-primary">(Admin)</span>}
            </h3>
            <div className="grid gap-2">
                {dailyWindows.map((window) => {
                  const winners = dailyWinners.filter(w => w.daily_window?.id === window.id)
                  const isPast = new Date(window.end_time) < new Date()
                  const isActive = activeWindowId === window.id
                  const isEditingPrize = editingPrizeId === window.id
                  const isEditingWinner = editingWinnerId === window.id
                  
                  return (
                    <div 
                      key={window.id}
                      onClick={() => isAdmin && handleSetActiveWindow(window.id)}
                      className={`rounded-xl p-4 border transition-all ${
                        isAdmin ? 'cursor-pointer hover:border-emerald-500/50' : ''
                      } ${
                        isActive 
                          ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' 
                          : (isPast || window.is_locked)
                            ? 'bg-card/50 border-border/50 opacity-60' 
                            : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          winners.length > 0 ? 'bg-yellow-500/20' : isActive ? 'bg-emerald-500/20' : 'bg-muted/20'
                        }`}>
                          {winners.length > 0 ? (
                            <CheckCircle className="w-5 h-5 text-yellow-400" />
                          ) : isActive ? (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          ) : (
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{window.name}</p>
                          {window.is_locked && (
                             <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-black tracking-wider border border-zinc-700">Completed</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{formatDate(window.start_time)}</p>
                      </div>
                      <div className="text-right">
                        {isEditingWinner ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={winnerInput}
                              onChange={(e) => setWinnerInput(e.target.value)}
                              placeholder="Username"
                              className="w-24 px-2 py-1 text-xs bg-background border border-border rounded"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSetWinner(window.id)}
                              disabled={savingData}
                              className="h-6 px-2 text-[10px]"
                            >
                              {savingData ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Set'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingWinnerId(null); setWinnerInput('') }}
                              className="h-6 px-2 text-[10px]"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : winners.length > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-[10px] text-muted-foreground uppercase">Winners</p>
                            {winners.map(w => (
                              <div key={w.user_id} className="flex items-center gap-1 group">
                                <p className="text-xs font-bold text-yellow-400">@{w.profiles?.username}</p>
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveWinner(window.id, w.user_id) }}
                                    className="p-1 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 rounded transition-colors"
                                    title="Remove winner"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingWinnerId(window.id); setWinnerInput('') }}
                                className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                              >
                                <UserPlus className="w-3 h-3" /> Add More
                              </button>
                            )}
                          </div>
                        ) : isAdmin ? (
                          <div className="flex flex-col items-end">
                            <p className="text-[10px] text-muted-foreground uppercase">Actions</p>
                            <div className="flex items-center gap-1">
                               <button
                                onClick={(e) => { e.stopPropagation(); setEditingWinnerId(window.id); setWinnerInput('') }}
                                className="p-1 hover:bg-white/10 rounded flex items-center gap-1 text-[10px] text-zinc-400"
                              >
                                <UserPlus className="w-3 h-3" /> Winner
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {!isEditingWinner && (
                          <div className="mt-1">
                             {isEditingPrize ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={prizeInput}
                                  onChange={(e) => setPrizeInput(e.target.value)}
                                  placeholder="Prize"
                                  className="w-24 px-2 py-1 text-xs bg-background border border-border rounded"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSavePrize(window.id)}
                                  disabled={savingData}
                                  className="h-6 px-2 text-[10px]"
                                >
                                  {savingData ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
                                <div className="flex items-center gap-2 justify-end">
                                  {window.prize_description ? (
                                    <p className="text-sm font-bold text-primary">{window.prize_description}</p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/60 italic">TBD</p>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditingPrizeId(window.id); setPrizeInput(window.prize_description || '') }}
                                      className="p-1 hover:bg-white/10 rounded"
                                    >
                                      <Settings className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

          {isEnrolled && user && (
            <div className="mt-8 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveContest}
                disabled={leaving}
                className="text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                {leaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <LogOut className="w-3 h-3 mr-1" />}
                Leave Challenge
              </Button>
            </div>
          )}
        </div>

        <Navbar isDark={true} />
      </div>
    )
}
