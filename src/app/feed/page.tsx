'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ArrowLeft, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Smile, Trash2, Share2, X, Check, FileText } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '👏', '🚀', '😂', '😮', '💯']

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
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
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
  const [userPositions, setUserPositions] = useState<Position[]>([])
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [tradeCaption, setTradeCaption] = useState('')
  const [positionFilter, setPositionFilter] = useState<'all' | 'active' | 'closed'>('all')
  const feedRef = useRef<HTMLDivElement>(null)

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
      fetchFeed()
      fetchParticipants()
      const interval = setInterval(fetchFeed, 10000)
      return () => clearInterval(interval)
    }
  }, [authLoading, fetchFeed, fetchParticipants])

  useEffect(() => {
    if (showShareTrade && user) {
      fetchUserPositions()
    }
  }, [showShareTrade, user, fetchUserPositions])

  useEffect(() => {
    if (showRules || showShareTrade) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showRules, showShareTrade])

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
    return priceChange * direction * (pos.quantity || 1)
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
      <div className="relative max-w-lg mx-auto px-4 py-6" ref={feedRef}>
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/leaderboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="font-display font-black text-2xl text-white tracking-tighter uppercase">
                Contest Feed
              </h1>
              <p className="text-xs text-muted-foreground">Live activity from the playoff challenge</p>
            </div>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/70 hover:text-white text-xs font-bold"
          >
            <FileText className="w-4 h-4" />
            Rules
          </button>
        </header>

        {user && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-6 relative z-30">
            <textarea
              value={newMessage}
              onChange={handleMessageChange}
              placeholder="Share your thoughts with the contest..."
              className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px]"
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

            <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowShareTrade(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-emerald-400 text-xs font-bold shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share Trade
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{newMessage.length}/500</span>
                <Button
                  onClick={handlePostMessage}
                  disabled={posting || !newMessage.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl px-4"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Post</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
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
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 text-sm leading-relaxed text-slate-300">
                  <section>
                    <h3 className="text-white font-bold text-base mb-2 uppercase tracking-tight">Playoff Projection Markets Challenge</h3>
                    <p>
                      This pilot competition is built around a sports trading game that allows users to trade live player projections during games. 
                      Unlike traditional binary wagering, participants buy and sell continuously updating projections such as player yards or points 
                      as prices change in response to in-game events.
                    </p>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-white font-bold uppercase text-[11px] tracking-widest border-l-2 border-primary pl-2">Competition Structure</h4>
                    <ul className="space-y-2 list-disc pl-4 marker:text-primary">
                      <li>Participants receive an equal allocation of virtual currency.</li>
                      <li>Users trade on player projection markets throughout the active trading window.</li>
                      <li>Portfolio value changes based on percentage movements in assets.</li>
                      <li>Rankings are determined by total portfolio value over specific time periods.</li>
                    </ul>
                  </section>

                  <section className="space-y-3">
                    <h4 className="text-white font-bold uppercase text-[11px] tracking-widest border-l-2 border-primary pl-2">Prize Structure</h4>
                    <ul className="space-y-2 list-disc pl-4 marker:text-primary">
                      <li>Prizes increase from early rounds (Wild Card) to later stages.</li>
                      <li>Grand prize awarded to the participant with the highest overall portfolio at the Super Bowl conclusion.</li>
                      <li>Competition presented as "Sponsored by Kalshi".</li>
                    </ul>
                  </section>

                  <div className="pt-6 border-t border-slate-800/50 flex flex-col items-center text-center gap-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Contact & Support</p>
                    <a href="mailto:getdraftiq@gmail.com" className="text-primary hover:underline font-bold">getdraftiq@gmail.com</a>
                    <p className="text-[10px] text-slate-500 mt-2">© 2026 DraftIQ. All rights reserved.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

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
                className="w-full max-w-lg bg-[#0B1221] border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <h2 className="text-lg font-bold text-white">Share a Trade</h2>
                  <button onClick={() => setShowShareTrade(false)} className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <div className="flex gap-2">
                    {(['all', 'active', 'closed'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setPositionFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                          positionFilter === filter
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-slate-800/50 text-muted-foreground hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-3 bg-[#0B1221]">
                  {loadingPositions ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredPositions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      No {positionFilter !== 'all' ? positionFilter : ''} trades found
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
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            isSelected 
                              ? 'bg-primary/10 border-primary/50 shadow-inner' 
                              : 'bg-slate-900/40 border border-slate-800/50 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  pos.side === 'long' 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {pos.side === 'long' ? 'over' : 'under'}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isClosed 
                                    ? 'bg-slate-700/50 text-slate-400' 
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {isClosed ? 'CLOSED' : 'ACTIVE'}
                                </span>
                              </div>
                              <p className="font-bold text-white text-sm truncate">{pos.player_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                  Entry: <span className="text-white">{typeof pos.entry_price === 'number' ? pos.entry_price.toFixed(0) : '—'}</span>
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                  P/L: <span className={pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30 mt-1">
                                <Check className="w-4 h-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {selectedPosition && (
                  <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/20 pb-20 sm:pb-4">
                    <input
                      type="text"
                      value={tradeCaption}
                      onChange={e => setTradeCaption(e.target.value)}
                      placeholder="Add a caption (optional)..."
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                      maxLength={200}
                    />
                    <Button
                      onClick={handleShareTrade}
                      disabled={posting}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl h-12 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                      {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share to Feed
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {feed.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
              No activity yet. Be the first to post!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl relative overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        item.type === 'trade' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
                      }`}>
                        {item.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">@{item.username}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(item.created_at)}</span>
                      </div>
                    </div>
                    {user && item.user_id === user.id && (
                      <button
                        onClick={() => handleDeleteMessage(item.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="w-full">
                    {item.type === 'trade' && item.trade_details ? (
                      <div>
                        <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {item.trade_details.player_photo && (
                                <div className="relative flex-shrink-0">
                                  <img 
                                    src={item.trade_details.player_photo} 
                                    alt={item.trade_details.player_name}
                                    className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-white/10"
                                  />
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0B1221] flex items-center justify-center ${
                                    item.trade_details.side === 'long' ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}>
                                    {item.trade_details.side === 'long' ? (
                                      <ChevronUp className="w-3 h-3 text-white" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    item.trade_details.side === 'long' 
                                      ? 'bg-emerald-500/20 text-emerald-400' 
                                      : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {item.trade_details.side === 'long' ? 'over' : 'under'}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    item.trade_details.status === 'closed' 
                                      ? 'bg-slate-700/50 text-slate-400' 
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {item.trade_details.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
                                  </span>
                                </div>
                                <p className="font-bold text-white">{item.trade_details.player_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatPropType(item.trade_details.prop_type || '')} {item.trade_details.line ? `O/U ${item.trade_details.line}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {typeof item.trade_details.pnl === 'number' && (
                                <div className={`flex items-center gap-1 justify-end ${item.trade_details.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {item.trade_details.pnl >= 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4" />
                                  )}
                                  <span className="font-bold">
                                    {item.trade_details.pnl >= 0 ? '+' : ''}{item.trade_details.pnl.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              {typeof item.trade_details.pnl_percent === 'number' && (
                                <p className={`text-xs ${item.trade_details.pnl_percent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                  {item.trade_details.pnl_percent >= 0 ? '+' : ''}{item.trade_details.pnl_percent.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/50 text-xs text-muted-foreground">
                            <span>Entry: <span className="text-white font-medium">{typeof item.trade_details.entry_price === 'number' ? `${item.trade_details.entry_price.toFixed(0)}` : '—'}</span></span>
                            {item.trade_details.status === 'closed' && typeof item.trade_details.exit_price === 'number' && (
                              <span>Exit: <span className="text-white font-medium">{item.trade_details.exit_price.toFixed(0)}</span></span>
                            )}
                            {item.trade_details.status === 'active' && typeof item.trade_details.current_price === 'number' && (
                              <span>Current: <span className="text-white font-medium">{item.trade_details.current_price.toFixed(0)}</span></span>
                            )}
                            <span>Size: <span className="text-white font-medium">{item.trade_details.size}</span></span>
                          </div>
                        </div>
                        {item.content && (
                          <p className="text-sm text-zinc-300 mt-3 whitespace-pre-wrap break-words">
                            {renderContent(item.content)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-words">
                        {renderContent(item.content || '')}
                      </p>
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
                                <p className="text-xs text-zinc-400 mt-0.5">{reply.content}</p>
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
                            className="flex-1 bg-[#0B1221] border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
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
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
