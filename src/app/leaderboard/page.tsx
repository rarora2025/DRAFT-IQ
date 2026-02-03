'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Crown, TrendingUp, TrendingDown, Loader2, Calendar, Gift, CheckCircle, Users, LogOut, Settings, UserPlus, Trash2, ExternalLink, Lock, Unlock, Power, PowerOff, Key, X, MessageCircle, FileText, Activity, Zap } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { IQDisplay } from '@/components/IQDisplay'
import { useAuth } from '@/hooks/useAuth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

interface JoinCode {
  id: string
  code: string
  created_at: string
}

interface ContestUser {
  id: string
  user_id: string
  username: string
  portfolio_value: number
  total_return: number
  daily_return: number
  window_return: number
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
const CACHE_KEY = 'draftiq_leaderboard_cache_v1'
const CACHE_TTL_MS = 5 * 60 * 1000

  export default function LeaderboardPage({ 
    hideHeader = false,
    showRulesExternal,
    setShowRulesExternal,
    showFeedbackExternal,
    setShowFeedbackExternal
  }: { 
    hideHeader?: boolean
    showRulesExternal?: boolean
    setShowRulesExternal?: (val: boolean) => void
    showFeedbackExternal?: boolean
    setShowFeedbackExternal?: (val: boolean) => void
  }) {
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
    const [showCodeModal, setShowCodeModal] = useState(false)
    const [joinCodeInput, setJoinCodeInput] = useState('')
    const [joinCodes, setJoinCodes] = useState<JoinCode[]>([])
    const [newCodeInput, setNewCodeInput] = useState('')

    const [showRulesInternal, setShowRulesInternal] = useState(false)
    const [showFeedbackInternal, setShowFeedbackInternal] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    
    const showRules = showRulesExternal ?? showRulesInternal
    const setShowRules = setShowRulesExternal ?? setShowRulesInternal
    const showFeedback = showFeedbackExternal ?? showFeedbackInternal
    const setShowFeedback = setShowFeedbackExternal ?? setShowFeedbackInternal

    // Lock body scroll when Terms modal is open
    useEffect(() => {
      if (showTerms) {
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
      } else {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }, [showTerms])


  const [feedbackCategory, setFeedbackCategory] = useState('comment')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [feedbackOverall, setFeedbackOverall] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  const isAdmin = user && ADMIN_IDS.includes(user.id)

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) return
    setSubmittingFeedback(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: feedbackCategory,
          content: feedbackContent.trim(),
          contact_info: feedbackContact.trim(),
          overall_comments: feedbackOverall.trim()
        })
      })

      if (response.ok) {
        setShowFeedback(false)
        setFeedbackContent('')
        setFeedbackContact('')
        setFeedbackOverall('')
        alert('Thank you for your feedback!')
      } else {
        alert('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const fetchContestData = useCallback(async (windowId?: string) => {
      try {
        const leaderboardUrl = windowId 
          ? `/api/contest/leaderboard?windowId=${windowId}`
          : '/api/contest/leaderboard'

        const [contestRes, leaderboardRes, adminRes] = await Promise.all([
          fetch('/api/contest'),
          fetch(leaderboardUrl),
          isAdmin ? fetch('/api/contest/admin') : Promise.resolve(null)
        ])
        
        let contestData: any = {}
        let leaderboardData: any = {}
        
        try {
          if (contestRes.ok) contestData = await contestRes.json()
        } catch (e) {
          console.error('Error parsing contest data:', e)
        }

        try {
          if (leaderboardRes.ok) leaderboardData = await leaderboardRes.json()
        } catch (e) {
          console.error('Error parsing leaderboard data:', e)
        }
        
        if (adminRes && adminRes.ok) {
          try {
            const adminData = await adminRes.json()
            setJoinCodes(adminData.join_codes || [])
          } catch (e) {
            console.error('Error parsing admin data:', e)
          }
        }

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

        if (contestData.contest || leaderboardData.overall) {
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                timestamp: Date.now(),
                contest: contestData.contest || null,
                dailyWindows: contestData.contest?.daily_windows || [],
                leaderboard: leaderboardData.overall ? {
                  overall: leaderboardData.overall,
                  today: leaderboardData.today
                } : null,
                currentWindow: leaderboardData.current_window || null,
                activeWindowId: leaderboardData.active_window_id || null,
                dailyWinners: leaderboardData.daily_winners || []
              })
            )
          } catch (e) {
            console.warn('Failed to cache leaderboard data', e)
          }
        }
      } catch (error) {
        console.error('Error fetching contest data:', error)
      } finally {
        setLoading(false)
      }
    }, [user, isAdmin])

    useEffect(() => {
      if (!authLoading) {
        let usedCache = false
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) {
            const parsed = JSON.parse(cached)
            const isFresh = parsed?.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS
            if (isFresh) {
              usedCache = true
              if (parsed.contest) {
                setContest(parsed.contest)
                setDailyWindows(parsed.dailyWindows || [])
              }
              if (parsed.leaderboard) {
                setLeaderboard(parsed.leaderboard)
                setCurrentWindow(parsed.currentWindow || null)
                setActiveWindowId(parsed.activeWindowId || null)
                setDailyWinners(parsed.dailyWinners || [])
                if (user) {
                  const enrolled = parsed.leaderboard.overall.some((p: ContestUser) => p.user_id === user.id)
                  setIsEnrolled(enrolled)
                } else {
                  setIsEnrolled(false)
                }
              }
              setLoading(false)
            }
          }
        } catch (e) {
          console.warn('Failed to read leaderboard cache', e)
        }

        if (!usedCache) {
          fetchContestData(selectedWindowId || undefined)
        }

        const interval = setInterval(() => fetchContestData(selectedWindowId || undefined), CACHE_TTL_MS)
        return () => clearInterval(interval)
      }
    }, [authLoading, fetchContestData, selectedWindowId, user])

  const handleJoinContest = async () => {
    if (!user || !joinCodeInput) return
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
        body: JSON.stringify({ code: joinCodeInput }),
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setIsEnrolled(true)
        setShowCodeModal(false)
        setJoinCodeInput('')
        fetchContestData()
      } else {
        alert(data.error || 'Failed to join challenge')
      }
    } catch (error) {
      console.error('Error joining contest:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const handleAddCode = async () => {
    if (!newCodeInput) return
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
          action: 'add_join_code',
          code: newCodeInput
        })
      })
      
      if (response.ok) {
        setNewCodeInput('')
        fetchContestData()
      }
    } catch (error) {
      console.error('Error adding code:', error)
    } finally {
      setSavingData(false)
    }
  }

  const handleRemoveParticipant = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to remove @${username} from the competition? This cannot be undone.`)) return
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
          action: 'remove_participant',
          user_id: userId
        })
      })
      
      if (response.ok) {
        fetchContestData()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to remove participant')
      }
    } catch (error) {
      console.error('Error removing participant:', error)
    } finally {
      setSavingData(false)
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

  const handleToggleLock = async (windowId: string) => {
    if (!isAdmin) return
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
          action: 'toggle_lock',
          window_id: windowId
        })
      })
      
      if (response.ok) {
        fetchContestData()
      }
    } catch (error) {
      console.error('Error toggling lock:', error)
    } finally {
      setSavingData(false)
    }
  }

  const handleSetActiveWindow = async (windowId: string) => {
    if (!isAdmin) return
    
    // If the window is already the override, clear it to return to schedule
    // If we want to FORCE OFF, we would set it to 'none'
    // Let's make it toggle: Active -> Force None -> Schedule
    
    let newOverrideId: string | null = windowId
    if (contest?.active_window_override_id === windowId) {
      newOverrideId = 'none' // Force off
    } else if (contest?.active_window_override_id === 'none') {
      newOverrideId = null // Back to schedule
    }

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

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this join code?')) return
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
          action: 'delete_join_code',
          id
        })
      })
      
      if (response.ok) {
        fetchContestData()
      }
    } catch (error) {
      console.error('Error deleting code:', error)
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

  const getDisplayRank = (index: number, list: ContestUser[], key: 'portfolio_value' | 'daily_return' | 'window_return') => {
    let rank = 1
    for (let i = 0; i < index; i++) {
      if ((list[i][key] ?? 0) > (list[index][key] ?? 0)) {
        rank++
      }
    }
    return rank
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

  // Container ref for layout
  const containerRef = useRef<HTMLDivElement>(null)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-start pt-[20vh] gap-4">
          <Activity className="w-8 h-8 animate-spin text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Syncing RANKS</p>
        </div>
    )
  }

  const isContestLive = contest?.status === 'live'
  
  return (
            <div ref={containerRef} className="min-h-screen bg-background pb-24 text-white">
              {/* Featured Super Bowl Challenge Banner - Scrolls with content */}
              <div className="px-3 pt-3 pb-2">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/20"
                >
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-red-500/10" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent" />
                  
                  {/* Subtle glow orbs */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 blur-[60px] rounded-full" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/15 blur-[50px] rounded-full" />
                  
                  <div className="relative p-4 sm:p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/40 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                          <Trophy className="w-5 h-5 sm:w-5 sm:h-5 text-white relative z-10 drop-shadow-lg" />
                        </div>
                        <div>
                          <h2 className="font-display font-black text-base sm:text-lg text-white tracking-tight">
                            NFL Super Bowl Challenge
                          </h2>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] sm:text-[10px] text-amber-300/90 font-bold uppercase tracking-widest">Featured Event</p>
                            <div className="flex items-center gap-1.5 sm:hidden">
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-sm">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mt-3">
                      <p className="text-xs sm:text-sm text-zinc-200/90">
                        Trade player projections throughout the playoffs.
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">
                        Rankings based on total balance after the Super Bowl. <button onClick={() => setShowTerms(true)} className="text-amber-400/80 hover:text-amber-400 underline underline-offset-2 transition-colors">Terms and Conditions</button>
                      </p>
                    </div>

                    {/* Prize Pool Grid - bigger numbers */}
                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10 mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Prize Pool
                        </span>
                        <span className="text-base font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                          $500 Total
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center">
                        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/30 rounded-lg p-2 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-yellow-400/10" />
                          <span className="text-lg sm:text-xl relative z-10">🥇</span>
                          <p className="text-sm sm:text-base font-black text-yellow-400 relative z-10">$100</p>
                        </div>
                        <div className="bg-gradient-to-br from-zinc-400/15 to-zinc-500/10 border border-zinc-400/25 rounded-lg p-2 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-zinc-300/10" />
                          <span className="text-lg sm:text-xl relative z-10">🥈</span>
                          <p className="text-sm sm:text-base font-black text-zinc-300 relative z-10">$75</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-600/20 to-orange-700/10 border border-amber-600/30 rounded-lg p-2 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-amber-500/10" />
                          <span className="text-lg sm:text-xl relative z-10">🥉</span>
                          <p className="text-sm sm:text-base font-black text-amber-400 relative z-10">$60</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">4th</span>
                          <p className="text-sm font-black text-zinc-400">$50</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">5th</span>
                          <p className="text-sm font-black text-zinc-400">$45</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">6th</span>
                          <p className="text-sm font-black text-zinc-400">$40</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">7th</span>
                          <p className="text-sm font-black text-zinc-400">$35</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">8th</span>
                          <p className="text-sm font-black text-zinc-400">$30</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">9th</span>
                          <p className="text-sm font-black text-zinc-400">$25</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-2">
                          <span className="text-[10px] font-bold text-zinc-500">10th</span>
                          <p className="text-sm font-black text-zinc-400">$20</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

            <div className="relative max-w-7xl mx-auto px-4 py-6 space-y-6">
              
                  {!hideHeader && (
                    <header className="text-center relative space-y-3">
                        <h1 className="font-display font-black text-5xl sm:text-6xl text-white tracking-tighter uppercase italic">
                        RANKS
                      </h1>
                    
                      {contest && (
                          <div className="flex items-center justify-center gap-4 text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-primary/50" />
                              Total #Traders: {contest.participant_count}
                            </span>
                          </div>
                      )}
                    
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setShowFeedback(true)}
                        className="flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Feedback</span>
                      </button>
                      <button
                        onClick={() => setShowRules(true)}
                        className="flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Rules</span>
                      </button>
                    </div>
                  </header>
                )}
  
            {hideHeader && contest && (
              <div className="hidden items-center justify-between px-2 text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-primary/50" />
                        Total #Traders: {contest.participant_count}
                      </span>
                    </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowRules(true)} className="hover:text-primary transition-colors">Rules</button>
                  <button onClick={() => setShowFeedback(true)} className="hover:text-primary transition-colors">Feedback</button>
                </div>
              </div>
            )}
  
          {isEnrolled === false && user && isContestLive && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 rounded-[2rem] p-10 text-center shadow-2xl shadow-primary/10"
            >
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
              <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
              
              <h3 className="font-display font-black text-2xl text-white mb-3 uppercase tracking-tight">JOIN THE RANKS</h3>
              <p className="text-base text-zinc-400 mb-8 max-w-[320px] mx-auto">
                Trade markets and win daily prizes in the ultimate prediction contest.
              </p>
              <Button
                onClick={() => setShowCodeModal(true)}
                disabled={joining}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black px-10 uppercase tracking-widest text-base h-16 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
              >
                ENTER CODE
              </Button>
            </motion.div>
          )}
  
          {/* Join Code Modal */}
          {showCodeModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card border border-border w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowCodeModal(false)}
                  className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
  
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-2">
                    <Key className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black uppercase tracking-tight text-white">Enter Join Code</h3>
                    <p className="text-base text-muted-foreground mt-2">Please enter your invitation code to join the NFL Playoff Challenge.</p>
                  </div>
  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="ENTER CODE HERE"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      className="w-full h-16 bg-background border border-border rounded-2xl px-6 text-center font-mono font-bold text-2xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-primary/20 uppercase"
                      autoFocus
                    />
                    <Button
                      onClick={handleJoinContest}
                      disabled={joining || !joinCodeInput}
                      className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base uppercase tracking-widest rounded-2xl"
                    >
                      {joining ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Validate & Join'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
  
          {!user && (
            <div className="bg-card border border-border rounded-[2rem] p-10 text-center bg-gradient-to-b from-card to-card/50">
              <h3 className="font-display font-black text-2xl text-white mb-3 uppercase tracking-tight">join the challenge</h3>
              <p className="text-zinc-400 text-base mb-8">Sign in to join the playoff challenge</p>
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-base h-16 rounded-2xl shadow-xl shadow-primary/20">
                <a href="/login?redirectTo=/leaderboard">Sign In</a>
              </Button>
            </div>
          )}
  
<Tabs defaultValue="overall" className="w-full">
              <TabsList className="w-full bg-black/20 border border-white/5 p-1.5 rounded-[1.25rem] h-16 shadow-inner">
                <TabsTrigger 
                  value="overall" 
                  className="w-full font-display font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-[0.9rem] transition-all h-full shadow-md"
                >
                  Overall
                </TabsTrigger>
              </TabsList>
  
<TabsContent value="overall" className="mt-4 space-y-3 outline-none">
                  {leaderboard.overall.length === 0 ? (
                    <div className="rounded-[2rem] p-16 text-center bg-card border border-border border-dashed">
                      <Trophy className="w-20 h-20 text-muted mx-auto mb-6 opacity-20" />
                      <p className="text-muted-foreground font-bold uppercase tracking-widest text-base">
                        No participants yet. Be the first to join!
                      </p>
                    </div>
                  ) : (
                    <>
                        {leaderboard.overall.map((entry, index) => {
                            const rank = getDisplayRank(index, leaderboard.overall, 'portfolio_value')
                            const isInPrizePosition = rank <= 10
                            const isPrizeLeader = rank <= 3
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`rounded-2xl p-4 border transition-all hover:bg-card/80 ${getRankBg(rank)} ${entry.user_id === user?.id ? 'ring-2 ring-primary shadow-xl shadow-primary/5' : 'bg-card border-border'} ${isInPrizePosition ? 'relative overflow-hidden' : ''}`}
                              >
                                  {/* Prize position indicator glow for top 10 */}
                                  {isInPrizePosition && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
                                  )}
                                  <div className="flex items-center gap-3 relative">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/50 border border-border flex-shrink-0">
                                      {getRankIcon(rank)}
                                    </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-display font-bold text-sm sm:text-base text-white truncate flex items-center gap-1.5">
                                            {entry.username}
                                            {entry.user_id === user?.id && (
                                              <span className="text-[8px] font-black uppercase tracking-widest text-primary px-1 py-0.5 bg-primary/10 rounded">You</span>
                                            )}
                                          </p>
                                          {isPrizeLeader && (
                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-400 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded">
                                              <Trophy className="w-2.5 h-2.5" />
                                              Prize Leader
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                          <div className={`text-[11px] font-bold uppercase tracking-wider ${(entry.daily_return ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {(entry.daily_return ?? 0) >= 0 ? '+' : ''}{(entry.daily_return ?? 0).toFixed(1)}% Today
                                          </div>
                                          {isInPrizePosition && !isPrizeLeader && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 flex items-center gap-1">
                                              <Gift className="w-2.5 h-2.5" />
                                              In Prize Position
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <IQDisplay 
                                          value={Math.round(entry.portfolio_value)} 
                                          valueClassName="text-base sm:text-lg text-white"
                                          iconClassName="w-4 h-4"
                                          className="justify-end"
                                        />
                                      </div>
                                  </div>
                              </motion.div>
                            )
                          })}
                        
                        {/* Footnote */}
                        <div className="text-center pt-4 pb-2">
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Final rankings determined after the Super Bowl concludes.
                          </p>
                        </div>
                    </>
                  )}
                </TabsContent>
    
                
            </Tabs>
  


            {isAdmin && (
              <div className="mt-12 space-y-8 border-t border-border/50 pt-8">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Key className="w-4 h-4 text-primary" />
                    Manage Join Codes
                  </h3>
                
                <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New code (e.g. PLAYOFFS)"
                    value={newCodeInput}
                    onChange={(e) => setNewCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    onClick={handleAddCode}
                    disabled={savingData || !newCodeInput}
                    size="sm"
                    className="rounded-xl px-4"
                  >
                    {savingData ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {joinCodes.map((code) => (
                    <div 
                      key={code.id}
                      className="flex items-center justify-between bg-background border border-border rounded-xl px-3 py-2"
                    >
                      <span className="font-mono text-xs font-bold">{code.code}</span>
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        disabled={savingData}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {joinCodes.length === 0 && (
                    <p className="col-span-2 text-center text-[10px] text-muted-foreground py-2 italic">
                      No active join codes. Users won't be able to join.
                    </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Modals */}

      <AnimatePresence>
        {/* Rules Modal */}
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setShowRules(false)
              }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0B1221] border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl mb-safe"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-white">Contest Rules</h2>
                </div>
                <button onClick={() => setShowRules(false)} className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 p-6 space-y-4 text-sm leading-relaxed text-slate-300">
                <section>
                  <p>
                    Pilot competition built around live player projection trading. 
                    Buy and sell projections in real-time as they change during games.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-primary pl-2">Structure</h4>
                  <ul className="space-y-1 list-disc pl-4 marker:text-primary">
                    <li>Start with equal virtual currency.</li>
                    <li>Trade player markets during active windows.</li>
                    <li>Portfolio changes with asset price movements.</li>
                    <li>Rankings based on total portfolio value.</li>
                  </ul>
                </section>

                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-primary pl-2">Prizes</h4>
                    <ul className="space-y-1 list-disc pl-4 marker:text-primary">
                      <li>Prizes to be announced via social media</li>
                      <li>Follow @draft.iq to learn more</li>
                    </ul>
                  </section>

                <div className="pt-4 border-t border-slate-800/50 flex flex-col items-center text-center gap-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Support</p>
                  <a href="mailto:getdraftiq@gmail.com" className="text-primary hover:underline font-bold text-xs">getdraftiq@gmail.com</a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Feedback Modal */}
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
            onClick={() => setShowFeedback(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0B1221] border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl mb-safe p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-display font-black uppercase tracking-tight text-white">Submit Feedback</h2>
                </div>
                <button onClick={() => setShowFeedback(false)} className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto pb-6 no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 h-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  >
                    <option value="comment">Overall Comment</option>
                    <option value="error">Error / Bug</option>
                    <option value="glitch">Glitch</option>
                    <option value="feature">Feature Request</option>
                    <option value="hack">Hack / Improvement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Details</label>
                  <textarea
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Describe the issue or suggestion..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 min-h-[120px] resize-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Info (Optional)</label>
                  <input
                    type="text"
                    value={feedbackContact}
                    onChange={(e) => setFeedbackContact(e.target.value)}
                    placeholder="Email or @username"
                    className="w-full bg-background border border-border rounded-xl px-4 h-12 text-base text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Other Comments</label>
                  <textarea
                    value={feedbackOverall}
                    onChange={(e) => setFeedbackOverall(e.target.value)}
                    placeholder="Anything else you'd like to share?"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 min-h-[80px] resize-none transition-all"
                  />
                </div>

                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback || !feedbackContent.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-sm h-14 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all mt-4"
                >
          {submittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Feedback'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Terms and Conditions Modal */}
          {showTerms && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
              onClick={() => setShowTerms(false)}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) setShowTerms(false)
                }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-[#0B1221] border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl mb-safe overscroll-contain"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0B1221] rounded-t-3xl sm:rounded-t-3xl flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">Official Rules</h2>
                  </div>
                  <button onClick={() => setShowTerms(false)} className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                  <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5 text-sm leading-relaxed text-slate-300">
                  {/* Header Notices */}
                  <div className="text-center space-y-1 pb-4 border-b border-slate-800/50">
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">DraftIQ NFL Super Bowl Challenge</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">No Purchase Necessary to Enter or Win</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">A Purchase Will Not Increase Your Chances of Winning</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">Void Where Prohibited</p>
                  </div>

                  {/* Sponsor */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Sponsor</h4>
                    <p className="text-zinc-400 text-xs">
                      The DraftIQ Trading Competition ("Promotion") is sponsored by DraftIQ, LLC.
                    </p>
                  </section>

                  {/* Promotion Period */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Promotion Period</h4>
                    <p className="text-zinc-400 text-xs">
                      The contest begins at the start of the 2025-2026 NFL Playoffs and concludes on February 8th, 2026 (Super Bowl Sunday). DraftIQ servers are the official time-keeping device for this Promotion.
                    </p>
                  </section>

                  {/* Eligibility */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Eligibility</h4>
                    <p className="text-zinc-400 text-xs">
                      Open to legal residents of the fifty (50) United States and the District of Columbia who are eighteen (18) years of age or older at the time of entry. Participants must be a U.S. Citizen or Permanent Resident to claim prizes. Employees of DraftIQ, LLC and their immediate family members are not eligible.
                    </p>
                  </section>

                  {/* How to Enter */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">How to Enter</h4>
                    <p className="text-zinc-400 text-xs">
                      Create a DraftIQ account and participate in the virtual prediction markets during the Promotion Period. Users are provided virtual IQ tokens for placing predictions. Virtual tokens cannot be purchased, transferred, or redeemed for cash value.
                    </p>
                    <p className="text-zinc-400 text-xs">
                      <span className="text-white font-semibold">Limit:</span> One (1) account per person. Any attempt to create multiple accounts or engage in fraudulent activity will result in immediate disqualification.
                    </p>
                  </section>

                  {/* Scoring */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Determination of Winners</h4>
                    <p className="text-zinc-400 text-xs">
                      Rankings are determined by total profit/loss (P/L) from virtual token trades at the conclusion of the Promotion Period. In the event of a tie, the tiebreaker will be awarded to the participant who reached their final P/L first, as recorded by DraftIQ servers.
                    </p>
                  </section>

                  {/* General Conditions */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">General Conditions</h4>
                    <p className="text-zinc-400 text-xs">
                      DraftIQ reserves the right, in its sole discretion, to disqualify any participant who tampers with the entry process, the operation of the Promotion, or violates these Official Rules. DraftIQ is not responsible for any technical failures, errors, omissions, interruptions, or delays in the operation of the Promotion.
                    </p>
                  </section>

                  {/* Limitation of Liability */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Limitation of Liability</h4>
                    <p className="text-zinc-400 text-xs">
                      By participating, entrants agree that DraftIQ, LLC, its affiliates, subsidiaries, and their respective officers, directors, employees, and agents shall not be liable for any injury, loss, damage, or expense arising out of or in connection with participation in this Promotion or the acceptance, use, or misuse of any prize, except in cases of gross negligence or intentional misconduct.
                    </p>
                  </section>

                  {/* Governing Law */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Governing Law</h4>
                    <p className="text-zinc-400 text-xs">
                      This Promotion is governed by the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes arising from this Promotion shall be resolved exclusively in the state or federal courts located in Delaware.
                    </p>
                  </section>

                  {/* Winners List */}
                  <section className="space-y-2">
                    <h4 className="text-white font-bold uppercase text-[10px] tracking-widest border-l-2 border-amber-400 pl-2">Winners List</h4>
                    <p className="text-zinc-400 text-xs">
                      A list of winners will be available after February 10th, 2026 by sending a request to: <a href="mailto:getdraftiq@gmail.com" className="text-amber-400 hover:underline">getdraftiq@gmail.com</a>
                    </p>
                  </section>

                  {/* Disclaimer */}
                  <div className="pt-4 mt-4 border-t border-slate-800/50">
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      <span className="text-zinc-400 font-semibold">Disclaimer:</span> DraftIQ is a sports-trading simulation platform designed for entertainment and educational purposes only. Virtual tokens have no cash value and cannot be exchanged for real currency. This contest is based purely on simulated trading performance.
                    </p>
                  </div>

                  {/* Contact */}
                  <div className="pt-4 border-t border-slate-800/50 flex flex-col items-center text-center gap-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Questions?</p>
                    <a href="mailto:getdraftiq@gmail.com" className="text-amber-400 hover:underline font-bold text-xs">getdraftiq@gmail.com</a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  )
}

