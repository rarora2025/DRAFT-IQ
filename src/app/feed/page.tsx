'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ArrowLeft, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Smile, Trash2, Share2, X, Check, FileText, PlusCircle, AlertCircle } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '👏', '🚀', '😂', '😮', '💯']
const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

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

interface Position {
  id: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  exit_price: number | null
  realized_pnl: number | null
  closed_at: string | null
  market_title: string
  player_prop_id: string | null
  quantity: number
  player_name?: string
  prop_type?: string
  line?: number
  current_value?: number
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null)
  const [posting, setPosting] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [participants, setParticipants] = useState<{ id: string; username: string }[]>([])
  const [showShareTrade, setShowShareTrade] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
    const [userPositions, setUserPositions] = useState<Position[]>([])
    const [loadingPositions, setLoadingPositions] = useState(false)
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
    const [tradeCaption, setTradeCaption] = useState('')
    const [positionFilter, setPositionFilter] = useState<'all' | 'active' | 'closed'>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const feedRef = useRef<HTMLDivElement>(null)

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/feed')
    }
  }, [authLoading, user, router])

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState('comment')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [feedbackOverall, setFeedbackOverall] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

    const checkEnrollment = useCallback(async () => {
      if (!user) {
        setIsEnrolled(false)
        return
      }

      // Automatically enroll admins or if in development mode for easier testing
      const isDev = process.env.NODE_ENV === 'development'
      if (isAdmin || isDev) {
        setIsEnrolled(true)
        return
      }

      try {
        const { data, error } = await supabase
          .from('contest_participants')
          .select('id')
          .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
          .eq('user_id', user.id)
          .maybeSingle()
        
        setIsEnrolled(!!data)
      } catch (error) {
        console.error('Error checking enrollment:', error)
        setIsEnrolled(false)
      }
    }, [user, isAdmin])

  const fetchFeed = useCallback(async () => {
    try {
      const response = await fetch('/api/contest/feed')
      const data = await response.json()
      if (data.feed) {
        setFeed(data.feed)
      }
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchParticipants = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(100)
      if (data) setParticipants(data)
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }, [])

  const fetchUserPositions = useCallback(async () => {
    if (!user) return
    setLoadingPositions(true)
    try {
      const { data: positions, error } = await supabase
        .from('positions')
        .select(`
          id,
          side,
          size,
          entry_price,
          exit_price,
          realized_pnl,
          closed_at,
          market_title,
          player_prop_id,
          quantity
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const propIds = (positions || []).filter(p => p.player_prop_id).map(p => p.player_prop_id)
      
      let propMap = new Map()
      let playerMap = new Map()
      
      if (propIds.length > 0) {
        const { data: props } = await supabase
          .from('player_props')
          .select('id, prop_type, line, current_value, player_id')
          .in('id', propIds)
        
        if (props) {
          props.forEach(p => propMap.set(p.id, p))
          
          const playerIds = [...new Set(props.map(p => p.player_id).filter(Boolean))]
          if (playerIds.length > 0) {
            const { data: players } = await supabase
              .from('players')
              .select('id, name')
              .in('id', playerIds)
            
            if (players) {
              players.forEach(p => playerMap.set(p.id, p))
            }
          }
        }
      }

      const enrichedPositions = (positions || []).map(pos => {
        const prop = propMap.get(pos.player_prop_id)
        const player = prop ? playerMap.get(prop.player_id) : null
        return {
          ...pos,
          player_name: player?.name || 'Unknown Player',
          prop_type: prop?.prop_type || '',
          line: prop?.line || 0,
          current_value: prop?.current_value || pos.entry_price
        }
      })

      setUserPositions(enrichedPositions)
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoadingPositions(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      checkEnrollment()
      fetchFeed()
      fetchParticipants()
      const interval = setInterval(fetchFeed, 10000)
      return () => clearInterval(interval)
    }
  }, [authLoading, checkEnrollment, fetchFeed, fetchParticipants])

  useEffect(() => {
    if (showShareTrade && user) {
      fetchUserPositions()
    }
  }, [showShareTrade, user, fetchUserPositions])

  useEffect(() => {
    if (showRules || showShareTrade || showFeedback) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showRules, showShareTrade, showFeedback])

  const renderContent = (content: string) => {
    if (!content) return null
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary font-bold">{part}</span>
      }
      return part
    })
  }

  useEffect(() => {
    const channel = supabase
      .channel('contest_feed_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contest_feed' },
        () => fetchFeed()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contest_feed_reactions' },
        () => fetchFeed()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeed])

  const handlePostMessage = async () => {
    if (!newMessage.trim() || !user) return
    setPosting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'message', content: newMessage.trim() })
      })

      if (response.ok) {
        setNewMessage('')
        setShowMentions(false)
        fetchFeed()
      } else {
        const errorData = await response.json()
        alert(`Failed to post: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error posting message:', error)
    } finally {
      setPosting(false)
    }
  }

  const handleShareTrade = async () => {
    if (!selectedPosition || !user) return
    setPosting(true)
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
          position_id: selectedPosition.id,
          caption: tradeCaption.trim() || null
        })
      })

      if (response.ok) {
        setShowShareTrade(false)
        setSelectedPosition(null)
        setTradeCaption('')
        fetchFeed()
      }
    } catch (error) {
      console.error('Error sharing trade:', error)
    } finally {
      setPosting(false)
    }
  }

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

  const handleMentionSelect = (username: string) => {
    const parts = newMessage.split(' ')
    parts[parts.length - 1] = `@${username} `
    setNewMessage(parts.join(' '))
    setShowMentions(false)
  }

  const filteredParticipants = participants.filter(p => 
    p.username.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNewMessage(val)
    
    const lastWord = val.split(' ').pop() || ''
    if (lastWord.startsWith('@')) {
      setMentionSearch(lastWord.slice(1))
      setShowMentions(true)
    } else {
      setShowMentions(false)
    }
  }

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return
    setPosting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'message', content: replyContent.trim(), parent_id: parentId })
      })

      if (response.ok) {
        setReplyContent('')
        setReplyTo(null)
        setExpandedReplies(prev => new Set(prev).add(parentId))
        fetchFeed()
      } else {
        const errorData = await response.json()
        alert(`Failed to reply: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error posting reply:', error)
    } finally {
      setPosting(false)
    }
  }

  const handleReaction = async (feedItemId: string, emoji: string) => {
    if (!user) return
    
    setFeed(currentFeed => currentFeed.map(item => {
      if (item.id !== feedItemId) return item
      
      const existingReaction = item.reactions.find(r => r.emoji === emoji)
      const userHasReacted = existingReaction?.user_ids.includes(user.id)
      
      let newReactions = [...item.reactions]
      if (userHasReacted) {
        newReactions = newReactions.map(r => 
          r.emoji === emoji 
            ? { ...r, count: r.count - 1, user_ids: r.user_ids.filter(id => id !== user.id) }
            : r
        ).filter(r => r.count > 0)
      } else if (existingReaction) {
        newReactions = newReactions.map(r =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, user_ids: [...r.user_ids, user.id] }
            : r
        )
      } else {
        newReactions.push({ emoji, count: 1, user_ids: [user.id] })
      }
      
      return { ...item, reactions: newReactions }
    }))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      await fetch('/api/contest/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'reaction', feed_item_id: feedItemId, emoji })
      })
      
      setShowEmojiPicker(null)
    } catch (error) {
      console.error('Error reacting:', error)
      fetchFeed()
    }
  }

  const handleDeleteMessage = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this message?')) return
    
    setFeed(current => current.filter(item => item.id !== id))
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch(`/api/contest/feed?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchFeed()
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
      fetchFeed()
    }
  }

  const handleTogglePin = async (id: string) => {
    if (!isAdmin) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/feed', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'pin', id })
      })

      if (response.ok) {
        fetchFeed()
      }
    } catch (error) {
      console.error('Error toggling pin:', error)
    }
  }

  const handleEditMessage = async (id: string) => {
    if (!editContent.trim() || !user) return
    setPosting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/contest/feed', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'edit', id, content: editContent.trim() })
      })

      if (response.ok) {
        setEditingId(null)
        setEditContent('')
        fetchFeed()
      } else {
        const errorData = await response.json()
        alert(`Failed to edit: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error editing message:', error)
    } finally {
      setPosting(false)
    }
  }

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

  const hasUserReacted = (item: FeedItem, emoji: string) => {
    if (!user) return false
    const reaction = item.reactions.find(r => r.emoji === emoji)
    return reaction?.user_ids.includes(user.id) || false
  }

  const formatPropType = (propType: string) => {
    if (!propType) return ''
    return propType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPositionPnl = (pos: Position) => {
    if (pos.closed_at && pos.realized_pnl !== null) {
      return Number(pos.realized_pnl)
    }
    const currentPrice = pos.current_value || pos.entry_price
    const priceChange = currentPrice - pos.entry_price
    const direction = pos.side === 'long' ? 1 : -1
    const rawPnlPercent = (priceChange / pos.entry_price) * direction * 100
    const cappedPnlPercent = Math.min(rawPnlPercent, 100)
    return pos.size * (cappedPnlPercent / 100)
  }

  const filteredPositions = userPositions.filter(pos => {
    if (positionFilter === 'active') return !pos.closed_at
    if (positionFilter === 'closed') return !!pos.closed_at
    return true
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-white">
      <div className="relative max-w-lg mx-auto px-4 py-8" ref={feedRef}>
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
              Feed
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Community & Announcements</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFeedback(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Feedback</span>
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Rules</span>
            </button>
          </div>
        </header>

        {isEnrolled === false ? (
          <div className="space-y-6">
             <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/10">
                <MessageCircle className="w-10 h-10 text-primary opacity-40" />
              </div>
              <h3 className="text-lg font-display font-black uppercase tracking-tight text-white mb-2">Nothing to see here</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Join an active contest to see the live feed.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-12 px-8 rounded-xl">
                <Link href="/leaderboard">Join a Contest</Link>
              </Button>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6">
              <h3 className="font-display font-black text-lg uppercase tracking-tight text-white mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Quick Feedback
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Have an idea or found a bug? Let us know below!</p>
              <div className="space-y-4">
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="Found a glitch? Suggest a feature? Write it here..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 min-h-[100px] resize-none transition-all"
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback || !feedbackContent.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-12 rounded-xl"
                >
                  {submittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Feedback'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {user && (
                <div className="bg-card border border-border rounded-2xl p-4 mb-6 relative z-30 transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/40">
                <textarea
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Share your thoughts with the contest..."
                  className="w-full bg-transparent text-base text-white placeholder:text-zinc-500 resize-none focus:outline-none min-h-[80px]"
                  maxLength={500}
                />
                
                <AnimatePresence>
                  {showMentions && filteredParticipants.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 w-full mt-2 bg-[#0B1221] border border-slate-800 rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto"
                    >
                      <button
                        onClick={() => handleMentionSelect('everyone')}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-primary/20 transition-colors flex items-center gap-2 border-b border-white/5"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                          📢
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">@everyone</span>
                          <span className="text-[10px] text-zinc-500">Notify all participants</span>
                        </div>
                      </button>
                      {filteredParticipants.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleMentionSelect(p.username)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-800/50 transition-colors flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                            {p.username[0].toUpperCase()}
                          </div>
                          <span className="font-bold text-white">@{p.username}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowShareTrade(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Trade
                    </button>
                  </div>
                  <Button
                    onClick={handlePostMessage}
                    disabled={posting || !newMessage.trim()}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl px-4 h-9"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Post</>}
                  </Button>
                </div>
              </div>
            )}

            {feed.length === 0 ? (
              <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
                <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
                  No activity yet. Be the first to post!
                </p>
              </div>
            ) : (
                <div className="space-y-6">
                  {feed.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#020420] border border-white/5 rounded-[2rem] relative overflow-hidden shadow-xl"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 border bg-primary/10 text-primary border-primary/20">
                              {item.username[0]?.toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-white text-sm tracking-tight">@{item.username}</span>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{formatTime(item.created_at)}</span>
                            </div>
                          </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <button
                                  onClick={() => handleTogglePin(item.id)}
                                  className={`p-2 rounded-xl transition-all ${
                                    item.is_pinned 
                                      ? 'text-primary bg-primary/10' 
                                      : 'text-zinc-600 hover:text-primary hover:bg-primary/10'
                                  }`}
                                  title={item.is_pinned ? "Unpin message" : "Pin message"}
                                >
                                  <PlusCircle className={`w-4 h-4 ${item.is_pinned ? 'fill-current' : ''}`} />
                                </button>
                              )}
                              {user && (item.user_id === user.id || isAdmin) && (
                                <button
                                  onClick={() => {
                                    setEditingId(item.id)
                                    setEditContent(item.content || '')
                                  }}
                                  className="p-2 text-zinc-600 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  title="Edit message"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              {user && (item.user_id === user.id || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteMessage(item.id)}
                                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                        </div>

                        {item.is_pinned && (
                          <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg w-fit">
                            <PlusCircle className="w-3 h-3 text-primary fill-current" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Pinned</span>
                          </div>
                        )}

                        <div className="w-full">
                          {editingId === item.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-white/5 border border-primary/30 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <Button
                                  onClick={() => handleEditMessage(item.id)}
                                  disabled={posting || !editContent.trim()}
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl px-4"
                                >
                                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {item.type === 'trade' && item.trade_details ? (
                                <div className="flex flex-col w-full">
                                  <div className="w-full border-t border-white/5 pt-4 mb-4">
                                    <div className="flex items-center gap-4">
                                      {item.trade_details.player_photo && (
                                        <div className="relative flex-shrink-0">
                                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
                                            <img 
                                              src={item.trade_details.player_photo} 
                                              alt={item.trade_details.player_name}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border border-[#020420] flex items-center justify-center shadow-lg ${
                                            item.trade_details.side === 'long' ? 'bg-emerald-400' : 'bg-red-400'
                                          }`}>
                                            {item.trade_details.side === 'long' ? (
                                              <ChevronUp className="w-4 h-4 text-black" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4 text-black" />
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${
                                            item.trade_details.side === 'long' 
                                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' 
                                              : 'bg-red-400/10 text-red-400 border-red-400/20'
                                          }`}>
                                            {item.trade_details.side === 'long' ? 'over' : 'under'}
                                          </span>
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border tracking-widest ${
                                            item.trade_details.status === 'closed' 
                                              ? 'bg-zinc-800/50 text-zinc-500 border-zinc-800' 
                                              : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                          }`}>
                                            {item.trade_details.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
                                          </span>
                                        </div>
                                        <h3 className="text-lg font-black text-white tracking-tight truncate">{item.trade_details.player_name}</h3>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                                          {formatPropType(item.trade_details.prop_type || '')} {item.trade_details.line ? `O/U ${item.trade_details.line}` : ''}
                                        </p>
                                      </div>

                                      <div className="text-right flex-shrink-0">
                                        {typeof item.trade_details.pnl === 'number' && (
                                          <div className={`text-lg font-black font-mono leading-none ${item.trade_details.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {item.trade_details.pnl >= 0 ? '+' : ''}{item.trade_details.pnl.toFixed(1)}
                                          </div>
                                        )}
                                        {typeof item.trade_details.pnl_percent === 'number' && (
                                          <div className={`text-[10px] font-bold font-mono mt-0.5 ${item.trade_details.pnl_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {item.trade_details.pnl_percent >= 0 ? '+' : ''}{item.trade_details.pnl_percent.toFixed(1)}%
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {item.content && (
                                    <div className="w-full">
                                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                                        {renderContent(item.content)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                                  {renderContent(item.content || '')}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {item.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(item.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                              hasUserReacted(item, reaction.emoji)
                                ? 'bg-primary/20 border border-primary/30'
                                : 'bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/50'
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="font-bold">{reaction.count}</span>
                          </button>
                        ))}

                        <div className="relative">
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === item.id ? null : item.id)}
                            className="p-1.5 rounded-full bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                          >
                            <Smile className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          <AnimatePresence>
                            {showEmojiPicker === item.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute left-0 bottom-full mb-1 z-50 bg-[#0B1221] border border-slate-800 rounded-xl p-2 flex gap-1 shadow-xl"
                              >
                                {EMOJI_OPTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(item.id, emoji)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button
                          onClick={() => setReplyTo(replyTo === item.id ? null : item.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/50 transition-all text-muted-foreground"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Reply
                        </button>
                      </div>

                      {item.replies.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <button
                            onClick={() => {
                              setExpandedReplies(prev => {
                                const next = new Set(prev)
                                if (next.has(item.id)) next.delete(item.id)
                                else next.add(item.id)
                                return next
                              })
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors mb-2"
                          >
                            {expandedReplies.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                          </button>

                          <AnimatePresence>
                            {expandedReplies.has(item.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-2 overflow-hidden"
                              >
                                {item.replies.map((reply) => (
                                  <div key={reply.id} className="pl-4 border-l-2 border-border/50">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-xs">@{reply.username}</span>
                                      <span className="text-[10px] text-muted-foreground">{formatTime(reply.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-0.5">{reply.content}</p>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <AnimatePresence>
                        {replyTo === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-4 border-t border-border/50 overflow-hidden"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Reply to @${item.username}...`}
                                className="flex-1 bg-[#0B1221] border border-slate-800 rounded-xl px-3 py-2 text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                maxLength={500}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handlePostReply(item.id)
                                  }
                                }}
                              />
                              <Button
                                onClick={() => handlePostReply(item.id)}
                                disabled={posting || !replyContent.trim()}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 rounded-xl px-3"
                              >
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
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
                      <li>Prizes increase in later tournament stages.</li>
                      <li>they will be announced as weeks go on</li>
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

              <div className="space-y-4 overflow-y-auto pb-6">
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

        {/* Share Trade Modal */}
        {showShareTrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
            onClick={() => setShowShareTrade(false)}
          >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) setShowShareTrade(false)
                }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-[#020420] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl mb-safe"
              >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                      <Share2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight uppercase">Share a Trade</h2>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Select a position to post to feed</p>
                    </div>
                  </div>
                  <button onClick={() => setShowShareTrade(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>

                <div className="p-4 border-b border-white/5 bg-white/5">
                  <div className="flex gap-2">
                    {(['all', 'active', 'closed'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setPositionFilter(filter)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          positionFilter === filter
                            ? 'bg-primary text-black shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#020420] pb-40">
                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filteredPositions.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <TrendingUp className="w-8 h-8 text-zinc-800" />
                      </div>
                      <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">
                        No {positionFilter !== 'all' ? positionFilter : ''} trades found
                      </p>
                    </div>
                  ) : (
                    filteredPositions.map(pos => {
                      const pnl = getPositionPnl(pos)
                      const isSelected = selectedPosition?.id === pos.id
                      const isClosed = !!pos.closed_at
                      
                      return (
                        <button
                          key={pos.id}
                          onClick={() => setSelectedPosition(isSelected ? null : pos)}
                          className={`w-full text-left p-5 rounded-[1.5rem] border-2 transition-all duration-300 relative overflow-hidden group ${
                            isSelected 
                              ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,184,0,0.1)]' 
                              : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${
                                  pos.side === 'long' 
                                    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' 
                                    : 'bg-red-400/10 text-red-400 border-red-400/20'
                                }`}>
                                  {pos.side === 'long' ? 'over' : 'under'}
                                </span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border tracking-widest ${
                                  isClosed 
                                    ? 'bg-zinc-800/50 text-zinc-500 border-zinc-800' 
                                    : 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                                }`}>
                                  {isClosed ? 'CLOSED' : 'ACTIVE'}
                                </span>
                              </div>
                                <p className="font-black text-white text-lg tracking-tight group-hover:translate-x-1 transition-transform">{pos.player_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                    Entry: <span className="text-white font-mono">{typeof pos.entry_price === 'number' ? pos.entry_price.toFixed(0) : '—'}</span>
                                  </span>
                                  <div className="w-1 h-1 rounded-full bg-white/10" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    P/L: <span className={`font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            {isSelected ? (
                              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-xl shadow-primary/20 animate-in zoom-in-50 duration-300">
                                <Check className="w-6 h-6 text-black" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <div className="w-2 h-2 rounded-full bg-white/20" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                  <div className="h-24" /> {/* Bottom spacer for tab bar */}
                </div>

                {selectedPosition && (
                  <div className="p-6 border-t border-white/5 space-y-4 bg-[#020420]/80 backdrop-blur-xl pb-12 sm:pb-6">
                    <div className="relative">
                      <textarea
                        value={tradeCaption}
                        onChange={e => setTradeCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                        maxLength={200}
                      />
                    </div>
                    <Button
                      onClick={handleShareTrade}
                      disabled={posting}
                      className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-[0.98] text-xs"
                    >
                      {posting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          <Share2 className="w-5 h-5 mr-2" />
                          Post to Contest Feed
                        </>
                      )}
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
