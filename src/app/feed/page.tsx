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
  const [showRules, setShowRules] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  useEffect(() => {
    if (!authLoading && !user) {
      setFeed([])
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState('comment')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackContact, setFeedbackContact] = useState('')
  const [feedbackOverall, setFeedbackOverall] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

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

  useEffect(() => {
    if (showRules || showFeedback) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showRules, showFeedback])

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

    return (
      <div className="min-h-screen bg-[#020420] pb-24 text-white">
          <div className="relative max-w-4xl mx-auto px-4 py-8" ref={feedRef}>
            {topMovers.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Daily Player Movers</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {topMovers.slice(0, 3).map((player, i) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-[2rem] p-6 relative overflow-hidden group hover:border-primary/30 transition-all shadow-xl"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-12 h-12 text-emerald-400" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
                            <img src={player.pfp} alt={player.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">Player Mover</p>
                            <h3 className="text-base font-black text-white uppercase italic tracking-tight truncate">
                              {player.name}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Change</p>
                            <p className={`text-lg font-black font-mono ${player.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {player.change >= 0 ? '+' : ''}{player.change?.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Projection</p>
                            <p className="text-sm font-black font-mono text-white">
                              {player.price?.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Feedback</span>
                </button>
              <button
                onClick={() => setShowRules(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:text-primary text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Rules</span>
              </button>
            </div>
          </header>

          <>
            {user && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-8 relative z-30 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 shadow-2xl">
                <textarea
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent text-lg text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[100px] font-medium"
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
                          <span className="font-bold text-primary uppercase tracking-tight">@everyone</span>
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
                          <span className="font-bold text-white tracking-tight">@{p.username}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/5">
                  <Button
                    onClick={handlePostMessage}
                    disabled={posting || !newMessage.trim()}
                    className="bg-primary hover:bg-primary/90 text-[#020420] font-black text-xs uppercase tracking-[0.2em] rounded-2xl px-8 h-12 shadow-xl shadow-primary/10 active:scale-95 transition-all"
                  >
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Post</>}
                  </Button>
                </div>
              </div>
            )}

            {feed.length === 0 ? (
              <div className="bg-white/5 border border-white/10 border-dashed rounded-[3rem] p-24 text-center">
                <MessageCircle className="w-16 h-16 text-zinc-800 mx-auto mb-6" />
                <p className="text-zinc-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  The community is quiet. Start the conversation.
                </p>
              </div>
            ) : (
                <div className="space-y-6">
                  {feed.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/5 rounded-[2.5rem] relative overflow-hidden shadow-2xl group hover:border-white/10 transition-all duration-500"
                    >
                      <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black flex-shrink-0 border bg-primary/10 text-primary border-primary/20 shadow-lg">
                              {item.username[0]?.toUpperCase()}
                            </div>
                              <div className="flex flex-col">
                                <span className="font-black text-white text-base tracking-tight uppercase italic">{item.username}</span>
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
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
                                          <img 
                                            src={item.trade_details.player_photo} 
                                            alt={item.trade_details.player_name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-white tracking-tight truncate">{item.trade_details.player_name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${
                                            item.trade_details.side === 'long' 
                                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' 
                                              : 'bg-red-400/10 text-red-400 border-red-400/20'
                                          }`}>
                                            Took {item.trade_details.side === 'long' ? 'OVER' : 'UNDER'}
                                          </span>
                                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            at {item.trade_details.line}
                                          </span>
                                        </div>
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
      </AnimatePresence>
    </div>
  )
}

