'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader2, ArrowLeft, TrendingUp, Heart, ThumbsUp, Flame, PartyPopper, ChevronDown, ChevronUp, Smile, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const EMOJI_OPTIONS = ['❤️', '👍', '🔥', '👏', '🚀', '😂', '😮', '💯']

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
  trade_details: { player_name: string; side: 'long' | 'short' } | null
  created_at: string
  reactions: FeedReaction[]
  replies: FeedReply[]
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
    
    // Optimistic update
    setFeed(currentFeed => currentFeed.map(item => {
      if (item.id !== feedItemId) return item
      
      const existingReaction = item.reactions.find(r => r.emoji === emoji)
      const userHasReacted = existingReaction?.user_ids.includes(user.id)
      
      let newReactions = [...item.reactions]
      if (userHasReacted) {
        // Remove reaction
        newReactions = newReactions.map(r => 
          r.emoji === emoji 
            ? { ...r, count: r.count - 1, user_ids: r.user_ids.filter(id => id !== user.id) }
            : r
        ).filter(r => r.count > 0)
      } else if (existingReaction) {
        // Add to existing
        newReactions = newReactions.map(r =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, user_ids: [...r.user_ids, user.id] }
            : r
        )
      } else {
        // New emoji
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
      // fetchFeed() // No need to fetch immediately, realtime will handle it or optimistic UI is enough
    } catch (error) {
      console.error('Error reacting:', error)
      fetchFeed() // Revert on error
    }
  }

  const handleDeleteMessage = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this message?')) return
    
    // Optimistic delete
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
        <header className="flex items-center gap-4 mb-6">
          <Link href="/leaderboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-display font-black text-2xl text-white tracking-tighter uppercase">
              Contest Feed
            </h1>
            <p className="text-xs text-muted-foreground">Live activity from the playoff challenge</p>
          </div>
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
                    className="absolute top-full left-0 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto"
                  >
                    {filteredParticipants.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleMentionSelect(p.username)}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors flex items-center gap-2"
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
          )}

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
                  className="bg-card border border-border rounded-2xl relative"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                        item.type === 'trade' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'
                      }`}>
                        {item.type === 'trade' ? <TrendingUp className="w-5 h-5" /> : item.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">@{item.username}</span>
                            <span className="text-[10px] text-muted-foreground">{formatTime(item.created_at)}</span>
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

                        {item.type === 'trade' ? (
                          <div className="text-sm text-zinc-300 mt-1">
                            Made a <span className="font-bold text-emerald-400">${item.trade_amount?.toFixed(0)}</span> trade
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap break-words">
                            {renderContent(item.content || '')}
                          </p>
                        )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {item.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(item.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                              hasUserReacted(item, reaction.emoji)
                                ? 'bg-primary/20 border border-primary/30'
                                : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="font-bold">{reaction.count}</span>
                          </button>
                        ))}

                        <div className="relative">
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === item.id ? null : item.id)}
                            className="p-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50 transition-colors"
                          >
                            <Smile className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          <AnimatePresence>
                            {showEmojiPicker === item.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute left-0 top-full mt-1 z-10 bg-zinc-900 border border-zinc-700 rounded-xl p-2 flex gap-1 shadow-xl"
                              >
                                {EMOJI_OPTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(item.id, emoji)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-700 transition-colors text-lg"
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
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700/50 transition-all text-muted-foreground"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Reply
                        </button>
                      </div>
                    </div>
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
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
