'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ArrowLeft, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Smile, Trash2, Share2, X, Check, FileText, PlusCircle, AlertCircle, Pencil, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

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
  is_pinned?: boolean
}

export default function FeedPage({ hideHeader = false }: { hideHeader?: boolean }) {
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
      if (!hideHeader) router.push('/login')
    }
  }, [authLoading, user, router, hideHeader])

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
        method: 'POST',
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
    return [...topMovers]
      .sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
      .slice(0, 3)
  }, [topMovers])

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen ${hideHeader ? 'bg-transparent' : 'bg-[#020420]'} flex flex-col items-center justify-start pt-[20vh] gap-4`}>
        <Activity className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Syncing community feed...</p>
      </div>
    )
  }

    return (
      <div className={`${hideHeader ? 'bg-transparent pb-10' : 'bg-[#020420] pb-24 min-h-screen'} text-white`}>
          <div className={`relative max-w-4xl mx-auto px-4 ${hideHeader ? 'py-4' : 'py-8'}`} ref={feedRef}>
            {topMovers.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-2.5 bg-primary rounded-full" />
                        <h2 className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Movers</h2>
                      </div>
                    </div>
                          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-2 px-2">
                            {visibleMovers.map((player, i) => (
                              <motion.div
                                key={`${player.id}-${i}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                onClick={() => router.push(`/players/${player.player_id}`)}
                                className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 relative overflow-hidden group hover:border-primary/40 transition-all shadow-2xl flex flex-col justify-center cursor-pointer min-w-[320px]"
                              >
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-20 transition-all group-hover:opacity-40 ${player.change >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                
                                <div className="relative z-10">
                                  <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-zinc-900 shrink-0 shadow-2xl transition-transform group-hover:scale-105">
                                      <img src={player.pfp} alt={player.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight truncate mb-2">
                                        {player.name}
                                      </h3>
                                      <div className="flex items-end justify-between gap-4">
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                                            {player.prop_type?.replace('_', ' ') || 'Points'}
                                          </span>
                                          <div className="text-4xl font-black font-mono text-white tracking-tighter leading-none">
                                            {player.price?.toFixed(1)}
                                          </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-lg font-black font-mono shadow-lg ${player.change >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
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

            {user && (
              <div className="space-y-6 mb-12">
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative z-30 transition-all focus-within:ring-4 focus-within:ring-primary/20 focus-within:border-primary/40 shadow-2xl">
                  <textarea
                    value={newMessage}
                    onChange={handleMessageChange}
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent text-xl text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[120px] font-medium leading-relaxed"
                    maxLength={500}
                  />
                  
                  <AnimatePresence>
                    {showMentions && filteredParticipants.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 w-full mt-4 bg-[#0B1221] border-2 border-slate-800 rounded-3xl overflow-hidden z-50 shadow-2xl max-h-80 overflow-y-auto"
                      >
                        <button
                          onClick={() => handleMentionSelect('everyone')}
                          className="w-full px-6 py-6 text-left text-base hover:bg-primary/20 transition-colors flex items-center gap-4 border-b border-white/5"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-xl font-bold">
                            📢
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-primary uppercase tracking-tight">everyone</span>
                            <span className="text-xs text-zinc-500 uppercase font-black">Notify all participants</span>
                          </div>
                        </button>
                        {filteredParticipants.map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleMentionSelect(p.username)}
                            className="w-full px-6 py-4 text-left text-base hover:bg-white/5 transition-colors flex items-center gap-4"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                              {p.username[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-white tracking-tight text-lg">{p.username}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white hover:bg-white/5 px-6 py-3 rounded-2xl transition-all border border-white/5"
                    >
                      <Share2 className="w-5 h-5" />
                      Share Trade
                    </button>
                    <Button
                      onClick={handlePostMessage}
                      disabled={posting || !newMessage.trim()}
                      className="bg-primary hover:bg-primary/90 text-[#020420] font-black text-sm uppercase tracking-[0.2em] rounded-2xl px-10 h-14 shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                    >
                      {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Now'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {feed.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-[2rem] p-12 text-center">
                <MessageCircle className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[9px]">
                  The community is quiet.
                </p>
              </div>
            ) : (
                <div className="space-y-3">
                  {feed.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.02] border border-white/5 rounded-[1.25rem] relative overflow-hidden shadow-2xl group hover:border-white/10 transition-all duration-300"
                    >
                          <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 border-2 bg-primary/10 text-primary border-primary/20 shadow-xl">
                                {item.username[0]?.toUpperCase()}
                              </div>
                                <div className="flex flex-col">
                                  <span className="font-black text-white text-base tracking-tight uppercase">{item.username}</span>
                                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">{formatTime(item.created_at)}</span>
                                </div>
                            </div>
                                <div className="flex items-center gap-2">
                                  {user && (item.user_id === user.id || isAdmin) && (
                                  <button
                                    onClick={() => {
                                      setEditingId(item.id)
                                      setEditContent(item.content || '')
                                    }}
                                    className="p-2 text-zinc-600 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {user && (item.user_id === user.id || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteMessage(item.id)}
                                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                          </div>

                          <div className="w-full">
                            {editingId === item.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full bg-white/5 border border-primary/30 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-3">
                                  <button onClick={() => setEditingId(null)} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancel</button>
                                  <Button onClick={() => handleEditMessage(item.id)} disabled={posting || !editContent.trim()} size="sm" className="bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-widest rounded-xl px-6 h-10">
                                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                              {item.type === 'trade' && item.trade_details ? (
                                    <div className="flex flex-col w-full gap-4">
                                      <div className={`w-full overflow-hidden border-2 rounded-[2rem] shadow-2xl relative ${
                                        item.trade_details.side === 'long' 
                                          ? 'bg-orange-500/5 border-orange-500/20' 
                                          : 'bg-blue-500/5 border-blue-500/20'
                                      }`}>
                                        {/* Background Glow */}
                                        <div className={`absolute inset-0 opacity-10 blur-3xl ${
                                          item.trade_details.side === 'long' ? 'bg-orange-500' : 'bg-blue-500'
                                        }`} />
                                        
                                          <div className="relative p-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                              <div className="relative">
                                                {item.trade_details.player_photo && (
                                                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 bg-zinc-900 shadow-xl relative shrink-0 z-10">
                                                      <img src={item.trade_details.player_photo} alt={item.trade_details.player_name} className="w-full h-full object-cover" />
                                                  </div>
                                                )}
                                                <div className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center border-2 border-[#020420] shadow-xl z-20 ${
                                                  item.trade_details.side === 'long' 
                                                    ? 'bg-orange-500 text-white' 
                                                    : 'bg-blue-500 text-white'
                                                }`}>
                                                  {item.trade_details.side === 'long' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                                                </div>
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex flex-col">
                                                  <span className={`text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 ${
                                                    item.trade_details.side === 'long' ? 'text-orange-400' : 'text-blue-400'
                                                  }`}>
                                                    {item.trade_details.side === 'long' ? 'Going Over' : 'Going Under'}
                                                  </span>
                                                  <h3 className="text-lg font-black text-white tracking-tight truncate uppercase leading-tight">{item.trade_details.player_name}</h3>
                                                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{item.trade_details.prop_type?.replace('player_points', 'points')?.replace('_', ' ')}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end shrink-0">
                                              <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-0.5">Target</span>
                                              <span className="text-xl font-black font-mono text-white tracking-tighter tabular-nums leading-none">
                                                {item.trade_details.line}
                                              </span>
                                            </div>
                                          </div>
                                      </div>
                                    {item.content && (
                                      <div className="w-full">
                                        <p className="text-lg text-white font-medium leading-relaxed bg-white/5 rounded-[1.5rem] p-6 border border-white/10 shadow-xl">
                                          {renderContent(item.content)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-lg text-zinc-200 whitespace-pre-wrap break-words leading-relaxed font-medium px-2">
                                    {renderContent(item.content || '')}
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                        <div className="flex items-center gap-3 mt-6 flex-wrap">
                          {item.reactions.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              onClick={() => handleReaction(item.id, reaction.emoji)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all ${
                                hasUserReacted(item, reaction.emoji)
                                  ? 'bg-primary/20 border-2 border-primary/30'
                                  : 'bg-slate-900/40 border-2 border-slate-800/50 hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="text-lg">{reaction.emoji}</span>
                              <span className="font-black">{reaction.count}</span>
                            </button>
                          ))}

                          <div className="relative">
                            <button
                              onClick={() => setShowEmojiPicker(showEmojiPicker === item.id ? null : item.id)}
                              className="p-2.5 rounded-xl bg-slate-900/40 border-2 border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                            >
                              <Smile className="w-5 h-5 text-muted-foreground" />
                            </button>
                            
                            <AnimatePresence>
                              {showEmojiPicker === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute left-0 bottom-full mb-3 z-50 bg-[#0B1221] border-2 border-slate-800 rounded-2xl p-3 flex gap-2 shadow-2xl"
                                >
                                  {EMOJI_OPTIONS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(item.id, emoji)}
                                      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors text-xl"
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-900/40 border-2 border-slate-800/50 hover:bg-slate-800/50 transition-all text-muted-foreground hover:text-white"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Reply
                          </button>
                        </div>


                        {item.replies.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-white/5">
                            <button
                              onClick={() => {
                                setExpandedReplies(prev => {
                                  const next = new Set(prev)
                                  if (next.has(item.id)) next.delete(item.id)
                                  else next.add(item.id)
                                  return next
                                })
                              }}
                              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-4"
                            >
                              {expandedReplies.has(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              {item.replies.length} {item.replies.length === 1 ? 'reply' : 'replies'}
                            </button>

                            <AnimatePresence>
                              {expandedReplies.has(item.id) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="space-y-4 overflow-hidden"
                                >
                                  {item.replies.map((reply) => (
                                    <div key={reply.id} className="pl-6 border-l-4 border-white/5 py-2">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-primary">
                                          {reply.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-black text-white text-xs uppercase tracking-tight">{reply.username}</span>
                                          <span className="text-[10px] text-zinc-600 font-bold">{formatTime(reply.created_at)}</span>
                                        </div>
                                      </div>
                                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">{reply.content}</p>
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
                              className="mt-6 pt-6 border-t border-white/5 overflow-hidden"
                            >
                              <div className="flex gap-4">
                                <input
                                  type="text"
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder={`Reply to ${item.username}...`}
                                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                  maxLength={500}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handlePostReply(item.id)
                                    }
                                  }}
                                />
                                <Button onClick={() => handlePostReply(item.id)} disabled={posting || !replyContent.trim()} size="sm" className="bg-primary hover:bg-primary/90 text-[#020420] rounded-2xl px-6 h-14">
                                  {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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

      <AnimatePresence>
        {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
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
                className="w-full max-w-md bg-[#0B1221] border border-white/10 rounded-[2rem] p-6 shadow-2xl my-auto"
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

              <div className="space-y-3 pr-1 mb-6 border-b border-white/5 pb-6">
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
                      className={`w-full border rounded-2xl p-4 text-left transition-all group flex items-center gap-4 ${sharingPosition?.id === pos.id ? (pos.side === 'long' ? 'bg-orange-500/10 border-orange-500' : 'bg-blue-500/10 border-blue-500') : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${pos.side === 'long' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {pos.side === 'long' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white uppercase tracking-tight truncate">{pos.market_title?.split(' - ')[0] || 'Unknown Player'}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{pos.side === 'long' ? 'OVER' : 'UNDER'} • ${pos.size?.toFixed(2) || '0.00'}</p>
                      </div>
                      {sharingPosition?.id === pos.id && <Check className="w-4 h-4 text-white" />}
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
                    className={`w-full font-black uppercase tracking-widest py-6 rounded-xl shadow-xl transition-all active:scale-95 ${
                      sharingPosition.side === 'long' 
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
                    }`}
                  >
                    {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Share2 className="w-4 h-4 mr-2" /> Share Trade</>}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hideHeader && <Navbar isDark={true} />}
    </div>
  )
}
