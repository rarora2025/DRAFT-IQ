'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ArrowLeft, Loader2, CheckCircle, MessageSquare, Megaphone, AtSign, Check, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Notification {
  id: string
  user_id: string
  sender_id: string
  type: 'announcement' | 'mention' | 'reply' | 'trade'
  title: string
  message: string
  link: string
  is_read: boolean
  created_at: string
  sender?: {
    username: string
    display_name: string
    avatar_url: string
  }
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.notifications) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications()
    }
  }, [authLoading, user, fetchNotifications])

  const markAsRead = async (id?: string) => {
    // Optimistic update
    if (id) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } else {
      setMarkingAll(true)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      })
      
      if (!res.ok) throw new Error('Failed to mark as read')
    } catch (error) {
      console.error('Error marking as read:', error)
      // Revert on error if single item
      if (id) {
        fetchNotifications()
      }
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = async (e: React.MouseEvent, notification: Notification) => {
    if (!notification.is_read) {
      // Don't await here, just start the process
      markAsRead(notification.id)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-4 h-4 text-primary" />
      case 'mention': return <AtSign className="w-4 h-4 text-emerald-400" />
      case 'reply': return <MessageSquare className="w-4 h-4 text-blue-400" />
      default: return <Bell className="w-4 h-4 text-zinc-400" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-background pb-32 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/feed" className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tighter truncate">Notifications</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{unreadCount} unread updates</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAsRead()}
              disabled={markingAll}
              className="w-full sm:w-auto px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
            >
              {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Mark All Read
            </button>
          )}
        </header>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl">
              <Bell className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative group ${notification.is_read ? 'opacity-70' : ''}`}
              >
                <Link
                  href={notification.link}
                  onClick={(e) => handleNotificationClick(e, notification)}
                  className={`block p-4 rounded-2xl border transition-all ${
                    notification.is_read 
                      ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                      : 'bg-primary/5 border-primary/20 hover:border-primary/40'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      notification.is_read ? 'bg-zinc-900 border border-white/5' : 'bg-primary/20 border border-primary/30'
                    }`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-white truncate">
                          {notification.title}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                        {notification.sender ? (
                          <>
                            <span className="text-primary font-bold">
                              {notification.sender.display_name || notification.sender.username || 'User'}
                            </span>{' '}
                            {notification.message.includes('mentioned you') ? 'mentioned you in the feed' : 
                             notification.message.includes('replied to your') ? 'replied to your message' : 
                             notification.message.includes('everyone') ? 'mentioned everyone' : 
                             notification.message.replace(/^@\w+ /, '')}
                          </>
                        ) : (
                          notification.message
                        )}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(255,184,0,0.5)]" />
                    )}
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
      <Navbar isDark={true} />
    </div>
  )
}
