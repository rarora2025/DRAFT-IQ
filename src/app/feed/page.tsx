'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp, Smile, Trash2, X, AlertCircle, Pencil, ArrowUpCircle, ArrowDownCircle, Activity } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    if (!authLoading) {
      fetchFeed()
      fetchParticipants()
      const interval = setInterval(fetchFeed, 10000)
      return () => clearInterval(interval)
    }
  }, [authLoading, fetchFeed, fetchParticipants])

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
      .slice(0, 1)
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
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-zinc-400">Daily Mover</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 px-1">
                  {visibleMovers.map((player, i) => (
                    <motion.div
                      key={`${player.id}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      onClick={() => router.push(`/players/${player.player_id}`)}
                      className={cn(
                        "group relative overflow-hidden rounded-xl p-[1px] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
                        player.change >= 0 ? "bg-gradient-to-br from-emerald-500/40 to-transparent" : "bg-gradient-to-br from-red-500/40 to-transparent"
                      )}
                    >
                      <div className="relative h-full w-full rounded-xl bg-[#020420]/90 p-3 sm:p-4 backdrop-blur-xl">
                        {/* Background Accents */}
                        <div className={cn(
                          "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px] opacity-15",
                          player.change >= 0 ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        
                        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                          {/* Player Photo */}
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-lg">
                              <img src={player.pfp} alt={player.name} className="w-full h-full object-cover" />
                            </div>
                          </div>
                          
                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-tight truncate">
                              {player.name}
                            </h3>
                            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              {player.prop_type?.toLowerCase().replace(/player[_\s]/g, '').replace(/_/g, ' ') || 'Points'}
                            </span>
                          </div>

                          {/* Value & Change */}
                          <div className={cn(
                            "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl border shrink-0",
                            player.change >= 0 
                              ? "bg-emerald-500/10 border-emerald-500/20" 
                              : "bg-red-500/10 border-red-500/20"
                          )}>
                            <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight leading-none">
                              {player.price?.toFixed(1)}
                            </div>
                            <div className={cn(
                              "text-xs sm:text-sm font-black font-mono leading-none",
                              player.change >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {player.change >= 0 ? '+' : ''}{player.change?.toFixed(1)}%
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

              <div className="flex items-center justify-end mt-6 pt-6 border-t border-white/5">
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
                                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{item.trade_details.prop_type?.toLowerCase().replace(/player[_\s]/g, '').replace(/_/g, ' ')}</span>
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

      {!hideHeader && <Navbar isDark={true} />}
    </div>
  )
}
