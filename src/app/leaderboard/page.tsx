'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Loader2, Calendar, Gift, CheckCircle, Users } from 'lucide-react'
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

  const fetchContestData = useCallback(async () => {
    try {
      const [contestRes, leaderboardRes] = await Promise.all([
        fetch('/api/contest'),
        fetch('/api/contest/leaderboard')
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
      fetchContestData()
      const interval = setInterval(fetchContestData, 30000)
      return () => clearInterval(interval)
    }
  }, [authLoading, fetchContestData])

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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const isContestLive = contest?.status === 'live'
  const isContestCompleted = contest?.status === 'completed'

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-6">
        <header className="text-center relative">
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full mb-4 border shadow-lg ${
            isContestLive 
              ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5' 
              : isContestCompleted 
                ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' 
                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-yellow-500/5'
          }`}>
            {isContestLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
            <Trophy className="w-5 h-5" />
            <span className="font-display font-black text-sm uppercase tracking-widest">
              {isContestLive ? 'LIVE' : isContestCompleted ? 'COMPLETED' : 'LEADERBOARD'}
            </span>
          </div>
          <h1 className="font-display font-black text-2xl text-white tracking-tight uppercase">
            NFL Playoff <span className="text-primary italic">Challenge</span>
          </h1>
          
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Presented by</span>
            <div className="relative h-5 w-16">
              <Image 
                src="/sponsors/kalshi.webp" 
                alt="Kalshi" 
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
          
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
            className="bg-gradient-to-r from-red-500/10 to-primary/10 border border-red-500/20 rounded-2xl p-6 text-center"
          >
            <h3 className="font-display font-bold text-lg text-white mb-2">Join the Challenge!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your current portfolio value becomes your starting point. Trade NFL playoff markets and compete for daily prizes!
            </p>
            <Button
              onClick={handleJoinContest}
              disabled={joining}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-8"
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
              Overall (Playoffs)
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
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        ${Math.round(entry.portfolio_value).toLocaleString()} Portfolio
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Return</p>
                      <div className={`flex items-center justify-end gap-1 font-mono font-black text-xl ${entry.total_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.total_return >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        {entry.total_return >= 0 ? '+' : ''}{entry.total_return.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="today" className="mt-6 space-y-4">
            {!currentWindow ? (
              <div className="rounded-3xl p-12 text-center bg-card border border-border border-dashed">
                <Calendar className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                  No active daily window. Challenge starts Jan 10!
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
            </h3>
            <div className="grid gap-2">
              {dailyWindows.map((window) => {
                const winner = dailyWinners.find(w => w.daily_window?.name === window.name)
                const isPast = new Date(window.end_time) < new Date()
                const isCurrent = currentWindow?.id === window.id
                
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
                        ) : window.prize_description ? (
                          <>
                            <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
                            <p className="text-sm font-bold text-primary">{window.prize_description}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground uppercase">Prize</p>
                            <p className="text-xs text-muted-foreground/60 italic">TBD</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              Prizes announced by admin before each game day
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Sponsored by</span>
            <div className="relative h-6 w-20">
              <Image 
                src="/sponsors/kalshi.webp" 
                alt="Kalshi" 
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            Trade on real-world events at kalshi.com
          </p>
        </div>
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
