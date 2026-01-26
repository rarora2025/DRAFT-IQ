'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ArrowLeft, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Smile, Trash2, Share2, X, Check, FileText, PlusCircle, AlertCircle, Pencil, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'

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

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
    const [feed, setFeed] = useState<FeedItem[]>([])
    const [topMovers, setTopMovers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [posting, setPosting] = useState(false)
    const [moversIndex, setMoversIndex] = useState(0)

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

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  useEffect(() => {
    if (!authLoading && !user) {
      setFeed([])
      router.push('/login')
    }
  }, [authLoading, user, router])

  const fetchFeed = useCallback(async () => {
    try {
      const [feedRes, tickerRes] = await Promise.all([
        fetch('/api/contest/feed'),
        fetch('/api/ticker')
      ])
      
      const feedData = await feedRes.json()
      const tickerData = await tickerRes.json()

      if (feedData.feed) {
        setFeed(feedData.feed)
      }
      if (tickerData.players) {
        setTopMovers(tickerData.players)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
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

  const fetchPositionsForSharing = useCallback(async () => {
    if (!user) return
    try {
      // Fetch both active and recently closed positions
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

  useEffect(() => {
    if (!authLoading) {
      fetchFeed()
      fetchParticipants()
      fetchPositionsForSharing()
      const interval = setInterval(fetchFeed, 10000)
      return () => clearInterval(interval)
    }
  }, [authLoading, fetchFeed, fetchParticipants, fetchPositionsForSharing])

  const renderContent = (content: string) => {
    if (!content) return null
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary font-bold">{part.replace('@', '')}</span>
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

  const handleShareTrade = async () => {
    if (!sharingPosition || posting) return
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
          position_id: sharingPosition.id,
          caption: shareCaption.trim() || null
        })
      })

      if (response.ok) {
        toast.success("Trade shared to community!")
        setShowShareModal(false)
        setSharingPosition(null)
        setShareCaption('')
        fetchFeed()
      } else {
        toast.error("Failed to share trade")
      }
    } catch (error) {
      console.error('Error sharing trade:', error)
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

  const visibleMovers = useMemo(() => {
    if (topMovers.length === 0) return []
    // Sort by magnitude
    const sorted = [...topMovers].sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
    const start = moversIndex
    const end = moversIndex + 3
    if (end <= sorted.length) {
      return sorted.slice(start, end)
    } else {
      return [...sorted.slice(start), ...sorted.slice(0, end - sorted.length)]
    }
  }, [topMovers, moversIndex])

  const nextMovers = () => {
    setMoversIndex((prev) => (prev + 1) % topMovers.length)
  }

  const prevMovers = () => {
    setMoversIndex((prev) => (prev - 1 + topMovers.length) % topMovers.length)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-start pt-[20vh] gap-4">
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing community feed...</p>
      </div>
    )
  }

    return (
      <div className="min-h-screen bg-[#020420] pb-24 text-white">
          <div className="relative max-w-4xl mx-auto px-4 py-8" ref={feedRef}>
            {topMovers.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Daily Player Movers</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMovers} className="p-1.5 hover:bg-white/5 rounded-full transition-colors border border-white/5">
                      <ChevronLeft className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button onClick={nextMovers} className="p-1.5 hover:bg-white/5 rounded-full transition-colors border border-white/5">
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {visibleMovers.map((player, i) => (
                    <motion.div
                      key={`${player.id}-${i}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/players/${player.player_id}`)}
                      className="bg-white/5 border border-white/10 rounded-[2rem] p-5 sm:p-6 relative overflow-hidden group hover:border-primary/30 transition-all shadow-2xl min-h-[140px] sm:min-h-[160px] flex flex-col justify-center cursor-pointer"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shrink-0 shadow-lg">
                            <img src={player.pfp} alt={player.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate leading-tight">
                              {player.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] sm:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Projection</span>
                              <div className="h-px flex-1 bg-white/5" />
                            </div>
                            <div className="flex items-center justify-between mt-1 gap-2">
                              <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tighter shrink-0">
                                {player.price?.toFixed(1)}
                              </div>
                              <div className={`px-2 sm:px-3 py-1 rounded-xl text-[11px] sm:text-sm font-black font-mono shadow-lg truncate ${player.change >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {player.change >= 0 ? '+' : ''}{player.change?.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          <>
            {user && (
              <div className="space-y-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-4 relative z-30 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 shadow-2xl">
                  <textarea
                    value={newMessage}
                    onChange={handleMessageChange}
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent text-base text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[80px] font-medium"
                    maxLength={500}
                  />
                  
                  <AnimatePresence>
                    {showMentions && filteredParticipants.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 w-full mt-2 bg-[#0B1221] border border-slate-800 rounded-2xl overflow-hidden z-50 shadow-2xl max-h-64 overflow-y-auto"
                      >
                        <button
                          onClick={() => handleMentionSelect('everyone')}
                          className="w-full px-4 py-4 text-left text-sm hover:bg-primary/20 transition-colors flex items-center gap-3 border-b border-white/5"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                            📢
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-primary uppercase tracking-tight">everyone</span>
                            <span className="text-[10px] text-zinc-500 uppercase font-black">Notify all participants</span>
                          </div>
                        </button>
                        {filteredParticipants.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleMentionSelect(p.username)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                              {p.username[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-white tracking-tight">{p.username}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-3 py-2 rounded-xl transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Trade
                    </button>
                    <Button
                      onClick={handlePostMessage}
                      disabled={posting || !newMessage.trim()}
                      className="bg-primary hover:bg-primary/90 text-[#020420] font-black text-[10px] uppercase tracking-[0.2em] rounded-xl px-6 h-10 shadow-xl shadow-primary/10 active:scale-95 transition-all"
                    >
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-2" /> Post</>}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {feed.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-[2rem] p-16 text-center">
                <MessageCircle className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  The community is quiet. Start the conversation.
                </p>
              </div>
            ) : (
                <div className="space-y-4">
                  {feed.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/5 rounded-[1.5rem] relative overflow-hidden shadow-2xl group hover:border-white/10 transition-all duration-300"
                    >
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 border bg-primary/10 text-primary border-primary/20 shadow-lg">
                              {item.username[0]?.toUpperCase()}
                            </div>
                              <div className="flex flex-col">
                                <span className="font-black text-white text-sm tracking-tight uppercase">{item.username}</span>
                                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{formatTime(item.created_at)}</span>
                              </div>
                          </div>
                              <div className="flex items-center gap-1.5">
                                {user && (item.user_id === user.id || isAdmin) && (
                                <button
                                  onClick={() => {
                                    setEditingId(item.id)
                                    setEditContent(item.content || '')
                                  }}
                                  className="p-1.5 text-zinc-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                  title="Edit message"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user && (item.user_id === user.id || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteMessage(item.id)}
                                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                        </div>

                        {item.is_pinned && (
                          <div className="flex items-center gap-1.5 mb-3 px-2 py-1 bg-primary/5 border border-primary/10 rounded-lg w-fit">
                            <PlusCircle className="w-2.5 h-2.5 text-primary fill-current" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Pinned</span>
                          </div>
                        )}

                        <div className="w-full">
                          {editingId === item.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-white/5 border border-primary/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <Button
                                  onClick={() => handleEditMessage(item.id)}
                                  disabled={posting || !editContent.trim()}
                                  size="sm"
                                  className="bg-primary hover:bg-primary/90 text-black font-black text-[9px] uppercase tracking-widest rounded-lg px-3 h-8"
                                >
                                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                            {item.type === 'trade' && item.trade_details ? (
                                  <div className="flex flex-col w-full">
                                    <div className="w-full bg-[#1a1f2e]/40 border border-white/5 rounded-2xl p-5 mb-3 shadow-inner">
                                      <div className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full border shadow-2xl shrink-0 ${
                            item.trade_details.side === 'long' 
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {item.trade_details.side === 'long' ? <ArrowUpCircle className="w-8 h-8" /> : <ArrowDownCircle className="w-8 h-8" />}
                          </div>

                                          {item.trade_details.player_photo && (
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl relative shrink-0">
                                              <img 
                                                src={item.trade_details.player_photo} 
                                                alt={item.trade_details.player_name}
                                                className="w-full h-full object-cover"
                                              />
                                            </div>
                                          )}
                                          
                                          <div className="min-w-0">
                                            <h3 className="text-xl font-black text-white tracking-tight truncate uppercase leading-none">{item.trade_details.player_name}</h3>
                                          </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Projection</span>
                                          <span className="text-3xl font-black font-mono text-white tracking-tighter tabular-nums leading-none">
                                            {item.trade_details.line}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  {item.content && (
                                    <div className="w-full mt-1">
                                      <p className="text-[14px] text-zinc-400 font-medium leading-relaxed bg-white/5 rounded-2xl p-4 border border-white/5">
                                        {renderContent(item.content)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (

                                <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed font-medium">
                                  {renderContent(item.content || '')}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        {item.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(item.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-all ${
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
                            className="p-1.5 rounded-lg bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                          >
                            <Smile className="w-3.5 h-3.5 text-muted-foreground" />
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
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/50 transition-all text-muted-foreground"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Reply
                        </button>
                      </div>

                      {item.replies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <button
                            onClick={() => {
                              setExpandedReplies(prev => {
                                const next = new Set(prev)
                                if (next.has(item.id)) next.delete(item.id)
                                else next.add(item.id)
                                return next
                              })
                            }}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors mb-2"
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
                                  <div key={reply.id} className="pl-3 border-l-2 border-border/30">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-[10px] uppercase">{reply.username}</span>
                                      <span className="text-[8px] text-muted-foreground">{formatTime(reply.created_at)}</span>
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
                            className="mt-3 pt-3 border-t border-border/30 overflow-hidden"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder={`Reply to ${item.username}...`}
                                className="flex-1 bg-[#0B1221] border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
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
                                className="bg-primary hover:bg-primary/90 rounded-xl px-3 h-8"
                              >
                                {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
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
        </div>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
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
              className="w-full max-w-md bg-[#0B1221] border border-white/10 rounded-[2rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Share a Trade</h2>
                <button 
                  onClick={() => {
                    setShowShareModal(false)
                    setSharingPosition(null)
                    setShareCaption('')
                  }} 
                  className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1 mb-6 border-b border-white/5 pb-6">
                {activePositions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">No trades to share</p>
                    <Link href="/markets" className="text-primary text-[10px] font-black uppercase mt-4 inline-block hover:underline">Go to Markets →</Link>
                  </div>
                ) : (
                  activePositions.map(pos => (
                    <button
                      key={pos.id}
                      onClick={() => setSharingPosition(pos)}
                      className={`w-full border rounded-2xl p-4 text-left transition-all group flex items-center gap-4 ${sharingPosition?.id === pos.id ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${pos.side === 'long' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {pos.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white uppercase tracking-tight truncate">{pos.market_title?.split(' - ')[0] || 'Unknown Player'}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{pos.side === 'long' ? 'OVER' : 'UNDER'} • ${pos.size?.toFixed(2) || '0.00'}</p>
                      </div>
                      {sharingPosition?.id === pos.id && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))
                )}
              </div>

              {sharingPosition && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Add a message (optional)</label>
                    <textarea
                      value={shareCaption}
                      onChange={(e) => setShareCaption(e.target.value)}
                      placeholder="What's your take on this trade?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleShareTrade}
                    disabled={posting}
                    className="w-full bg-primary hover:bg-primary/90 text-[#020420] font-black uppercase tracking-widest py-6 rounded-xl shadow-xl shadow-primary/10 transition-all active:scale-95"
                  >
                    {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-4 h-4 mr-2" /> Share Trade</>}
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
