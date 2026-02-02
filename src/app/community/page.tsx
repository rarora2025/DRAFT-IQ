'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, Send, Loader2, Share2, X, Check, Smile, Trash2, Pencil, PlusCircle, 
  Trophy, Medal, Crown, Calendar, Users, LogOut, Key, FileText, Activity, Zap, UserPlus,
  Power, Lock, Unlock, ArrowUpCircle, ArrowDownCircle, Info
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Constants
const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '👏', '🚀', '😂', '😮', '💯']
const ADMIN_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',') || []

// Interfaces
interface TradeDetails {
  position_id: string
  player_name: string
  prop_type: string
  side: 'long' | 'short'
  entry_price: number
  current_price?: number
  exit_price?: number
  size: number
  pnl?: number
  pnl_percent?: number
  status: 'active' | 'closed'
  line?: number
  player_photo?: string
}

interface FeedReply {
  id: string
  user_id: string
  username: string
  content: string
  created_at: string
}

interface FeedReaction {
  emoji: string
  count: number
  user_ids: string[]
}

interface FeedItem {
  id: string
  user_id: string
  username: string
  type: 'trade' | 'message'
  content: string | null
  trade_amount: number | null
  trade_details: TradeDetails | null
  created_at: string
  reactions: FeedReaction[]
  replies: FeedReply[]
  is_pinned?: boolean
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

interface JoinCode {
  id: string
  code: string
  created_at: string
}

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'feed'
  
  const [activeTabState, setActiveTabState] = useState(activeTab)

  useEffect(() => {
    setActiveTabState(activeTab)
  }, [activeTab])

  // --- Feed State ---
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [topMovers, setTopMovers] = useState<any[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [participants, setParticipants] = useState<{ id: string; username: string }[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [activePositions, setActivePositions] = useState<any[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareCaption, setShareCaption] = useState('')
  const [sharingPosition, setSharingPosition] = useState<any>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  // --- Leaderboard State ---
  const [contest, setContest] = useState<Contest | null>(null)
  const [leaderboard, setLeaderboard] = useState<{ overall: ContestUser[], today: ContestUser[] }>({ overall: [], today: [] })
  const [dailyWinners, setDailyWinners] = useState<DailyWinner[]>([])
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null)
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinCodes, setJoinCodes] = useState<JoinCode[]>([])
  const [newCodeInput, setNewCodeInput] = useState('')
  const [savingData, setSavingData] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const isAdmin = user && ADMIN_IDS.includes(user.id)

  // --- Feed Logic ---
  const fetchFeed = useCallback(async () => {
    try {
      const [feedRes, tickerRes] = await Promise.all([
        fetch('/api/contest/feed'),
        fetch('/api/ticker')
      ])
      
      const feedData = await feedRes.json()
      const tickerData = await tickerRes.json()

      if (feedData.feed) setFeed(feedData.feed)
      if (tickerData.players) setTopMovers(tickerData.players)
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setFeedLoading(false)
    }
  }, [])

  const fetchParticipants = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, username').limit(100)
      if (data) setParticipants(data)
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }, [])

  const fetchPositionsForSharing = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setActivePositions(data)
    } catch (error) {
      console.error('Error fetching positions:', error)
    }
  }, [user])

  // --- Leaderboard Logic ---
  const fetchContestData = useCallback(async () => {
    try {
      const [contestRes, leaderboardRes, adminRes] = await Promise.all([
        fetch('/api/contest'),
        fetch('/api/contest/leaderboard'),
        isAdmin ? fetch('/api/contest/admin') : Promise.resolve(null)
      ])
      
      const contestData = contestRes.ok ? await contestRes.json() : {}
      const leaderboardData = leaderboardRes.ok ? await leaderboardRes.json() : {}
      
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json()
        setJoinCodes(adminData.join_codes || [])
      }

      if (contestData.contest) {
        setContest(contestData.contest)
      }

      if (leaderboardData.overall) {
        setLeaderboard({
          overall: leaderboardData.overall,
          today: leaderboardData.today
        })
        setActiveWindowId(leaderboardData.active_window_id)
        setDailyWinners(leaderboardData.daily_winners || [])
        
        if (user) {
          setIsEnrolled(leaderboardData.overall.some((p: ContestUser) => p.user_id === user.id))
        } else {
          setIsEnrolled(false)
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (!authLoading && user) {
      fetchFeed()
      fetchParticipants()
      fetchPositionsForSharing()
      fetchContestData()
      
      const interval = setInterval(() => {
        fetchFeed()
        fetchContestData()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [authLoading, user, fetchFeed, fetchParticipants, fetchPositionsForSharing, fetchContestData])

  // Real-time subscription for Feed
  useEffect(() => {
    const channel = supabase
      .channel('contest_feed_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contest_feed' }, () => fetchFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contest_feed_reactions' }, () => fetchFeed())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchFeed])

  // --- Handlers ---
  const handlePostMessage = async () => {
    if (!newMessage.trim() || !user) return
    setPosting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/contest/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ type: 'message', content: newMessage.trim() })
      })
      if (response.ok) {
        setNewMessage('')
        setShowMentions(false)
        fetchFeed()
      }
    } catch (error) {
      console.error('Error posting message:', error)
    } finally {
      setPosting(false)
    }
  }

  const handleJoinContest = async () => {
    if (!user || !joinCodeInput) return
    setJoining(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/contest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
        toast.error(data.error || 'Failed to join challenge')
      }
    } catch (error) {
      console.error('Error joining contest:', error)
    } finally {
      setJoining(false)
    }
  }

  // --- UI Helpers ---
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
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
    return 'bg-white/5 border-white/5'
  }

  const visibleMovers = useMemo(() => {
    if (topMovers.length === 0) return []
    return [...topMovers].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0)).slice(0, 3)
  }, [topMovers])

  if (authLoading || (activeTabState === 'feed' && feedLoading) || (activeTabState === 'ranks' && leaderboardLoading)) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Loading Community...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020420] pb-24 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="font-display font-black text-4xl text-white tracking-tighter uppercase italic">Community</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">Connect, Compete, Win IQ</p>
        </header>

        <Tabs value={activeTabState} onValueChange={setActiveTabState} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-2xl h-14 mb-8">
            <TabsTrigger 
              value="feed" 
              className="font-display font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl transition-all h-full"
            >
              Feed
            </TabsTrigger>
            <TabsTrigger 
              value="ranks" 
              className="font-display font-black uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-black rounded-xl transition-all h-full"
            >
              Ranks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-0">
            {/* Movers */}
            {visibleMovers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {visibleMovers.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => router.push(`/players/${player.player_id}`)}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img src={player.pfp} className="w-10 h-10 rounded-lg object-cover" alt={player.name} />
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase truncate">{player.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-black">{player.price?.toFixed(1)} IQ</span>
                          <span className={`text-[10px] font-black ${player.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {player.change >= 0 ? '+' : ''}{player.change?.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Post Message */}
            {user && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Share your latest trade or thought..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[60px]"
                />
                <div className="flex justify-end mt-2 pt-2 border-t border-white/5">
                  <Button
                    onClick={handlePostMessage}
                    disabled={posting || !newMessage.trim()}
                    className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl px-6 h-9"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
                  </Button>
                </div>
              </div>
            )}

            {/* Feed List */}
            <div className="space-y-4">
              {feed.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black bg-primary/10 text-primary border border-primary/20">
                        {item.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase">{item.username}</p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{formatTime(item.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-zinc-300 leading-relaxed">
                    {item.type === 'trade' && item.trade_details ? (
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center border",
                              item.trade_details.side === 'long' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                              {item.trade_details.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                            </div>
                            <p className="font-black uppercase text-white">{item.trade_details.player_name}</p>
                          </div>
                          <p className="font-mono font-black text-white">{item.trade_details.line} IQ</p>
                        </div>
                      </div>
                    ) : null}
                    <p>{item.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ranks" className="mt-0 space-y-4">
            {isEnrolled === false && user && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center mb-8">
                <h3 className="font-black uppercase tracking-tight text-white text-lg mb-2">Join the Rankings</h3>
                <p className="text-zinc-400 text-sm mb-6">Compete with other traders for the top spot and earn bonus IQ.</p>
                <Button 
                  onClick={() => setShowCodeModal(true)}
                  className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-8 h-12 rounded-xl"
                >
                  Enter Join Code
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Traders</p>
                <p className="text-2xl font-black text-white">{contest?.participant_count || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Active Contest</p>
                <p className="text-xs font-black text-primary uppercase">{contest?.name || 'Loading...'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {leaderboard.overall.map((entry, index) => {
                const rank = index + 1
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "rounded-2xl p-5 border transition-all",
                      getRankBg(rank),
                      entry.user_id === user?.id ? "ring-2 ring-primary" : "border-white/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center shrink-0">
                        {getRankIcon(rank)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-base uppercase truncate">{entry.username}</p>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          entry.daily_return >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {entry.daily_return >= 0 ? '+' : ''}{entry.daily_return.toFixed(1)}% Today
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Wealth</p>
                        <p className="text-lg font-mono font-black text-white">{Math.round(entry.portfolio_value).toLocaleString()} IQ</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0B1221] border border-white/10 w-full max-w-md rounded-[2rem] p-8 text-center"
          >
            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Enter Join Code</h3>
            <p className="text-zinc-400 text-sm mb-6">Join the community competition.</p>
            <input
              type="text"
              placeholder="CODE"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-6 text-center font-mono font-black text-xl tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowCodeModal(false)}
                className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleJoinContest}
                disabled={joining || !joinCodeInput}
                className="flex-1 h-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest text-xs rounded-xl"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <Navbar isDark={true} />
    </div>
  )
}
