'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export function NotificationListener() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new
          toast(notification.title || 'New Notification', {
            description: notification.message,
            action: {
              label: 'View',
              onClick: () => router.push(notification.link || '/notifications')
            },
            duration: 5000,
          })

          // Also trigger a browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(notification.title || 'DraftIQ', {
              body: notification.message,
              icon: '/favicon.png'
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, router])

  return null
}
