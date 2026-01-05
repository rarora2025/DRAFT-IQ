'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Loader2, Calendar, Gift, CheckCircle, Users, LogOut, Settings } from 'lucide-react'
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
  daily_window: { name: string; start_time: string }
}

interface Contest {
  id: string
  name: string
  status: 'live' | 'completed'
  start_time: string
  end_time: string
  participant_count: number
  daily_windows: DailyWindow[]
}

const ADMIN_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',') || []

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [contest, setContest] = useState<Contest | null>(null)
  const [leaderboard, setLeaderboard] = useState<{ overall: ContestUser[], today: ContestUser[] }>({ overall: [], today: [] })
  const [dailyWindows, setDailyWindows] = useState<DailyWindow[]>([])
  const [dailyWinners, setDailyWinners] = useState<DailyWinner[]>([])
  const [currentWindow, setCurrentWindow] = useState<DailyWindow | null>(null)
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [prizeInput, setPrizeInput] = useState('')
  const [savingPrize, setSavingPrize] = useState(false)
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
    setSavingPrize(true)
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
      setSavingPrize(false)
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
        </header>

        {isEnrolled === false && user && isContestLive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
          >
            <h3 className="font-display font-bold text-lg text-white mb-2">Join the Challenge!</h3>
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

        {dailyWinners.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Daily Winners
            </h3>
            <div className="grid gap-2">
              {dailyWinners.map((winner) => (
                <div 
                  key={winner.id}
                  className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{winner.profiles?.username}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {winner.daily_window?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold">
                      +{winner.daily_return.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentWindow && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Window</p>
              <p className="font-bold text-white">{currentWindow.name}</p>
            </div>
            {currentWindow.prize_description && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
                <p className="text-sm font-bold text-primary">{currentWindow.prize_description}</p>
              </div>
            )}
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
                Daily
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
                        <div className={`flex items-center gap-1 font-mono text-xs ${entry.total_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {entry.total_return >= 0 ? '+' : ''}{entry.total_return.toFixed(1)}% since join
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
            {dailyWindows.length > 0 && (
              <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                {dailyWindows.map((window) => {
                  const isSelected = selectedWindowId === window.id || (!selectedWindowId && currentWindow?.id === window.id)
                  const isCurrent = currentWindow?.id === window.id
                  
                  return (
                    <button
                      key={window.id}
                      onClick={() => setSelectedWindowId(window.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                        isSelected 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {window.name}
                      {isCurrent && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-current inline-block animate-pulse" />}
                    </button>
                  )
                })}
              </div>
            )}

            {(!selectedWindowId && !currentWindow) && leaderboard.today.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
                <Calendar className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No active daily window. Select a window above to view its leaderboard!
                </p>
              </div>
            ) : leaderboard.today.length === 0 ? (
              <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
                <Trophy className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No participants yet
                </p>
              </div>
            ) : (
              <>
                {leaderboard.today[0] && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Daily Prize Leader</span>
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
                const winner = dailyWinners.find(w => w.daily_window?.name === window.name)
                const isPast = new Date(window.end_time) < new Date()
                const isCurrent = currentWindow?.id === window.id
                const isEditing = editingPrizeId === window.id
                
                return (
                  <div 
                    key={window.id}
                    className={`rounded-xl p-4 border ${
                      isCurrent 
                        ? 'bg-primary/10 border-primary/30' 
                        : isPast 
                          ? 'bg-card/50 border-border/50 opacity-60' 
                          : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        winner ? 'bg-yellow-500/20' : isCurrent ? 'bg-primary/20' : 'bg-muted/20'
                      }`}>
                        {winner ? (
                          <CheckCircle className="w-5 h-5 text-yellow-400" />
                        ) : isCurrent ? (
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{window.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(window.start_time)}</p>
                      </div>
                      <div className="text-right">
                        {winner ? (
                          <>
                            <p className="text-[10px] text-muted-foreground uppercase">Winner</p>
                            <p className="text-xs font-bold text-yellow-400">@{winner.profiles?.username}</p>
                          </>
                        ) : isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={prizeInput}
                              onChange={(e) => setPrizeInput(e.target.value)}
                              placeholder="e.g. $50 Gift Card"
                              className="w-32 px-2 py-1 text-xs bg-background border border-border rounded"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSavePrize(window.id)}
                              disabled={savingPrize}
                              className="h-6 px-2 text-[10px]"
                            >
                              {savingPrize ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingPrizeId(null); setPrizeInput('') }}
                              className="h-6 px-2 text-[10px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
                            <div className="flex items-center gap-2">
                              {window.prize_description ? (
                                <p className="text-sm font-bold text-primary">{window.prize_description}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground/60 italic">TBD</p>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => { setEditingPrizeId(window.id); setPrizeInput(window.prize_description || '') }}
                                  className="p-1 hover:bg-white/10 rounded"
                                >
                                  <Settings className="w-3 h-3 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </>
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
