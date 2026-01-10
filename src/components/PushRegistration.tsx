'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function PushRegistration() {
  const { user } = useAuth()
  const registrationAttempted = useRef(false)

  useEffect(() => {
    if (!user || registrationAttempted.current) return

    async function registerPush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported')
        return
      }

      registrationAttempted.current = true

      try {
        const registration = await navigator.serviceWorker.ready
        
        // If permission is already denied, don't keep asking
        if (Notification.permission === 'denied') {
          console.warn('Push permission was previously denied')
          return
        }

        // Request permission if not already granted
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') {
            return
          }
        }

        if (Notification.permission !== 'granted') {
          return
        }

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          if (!publicVapidKey) {
            console.error('VAPID public key is missing')
            return
          }

          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            })
          } catch (subscribeError: any) {
            // Handle specific "push service not available" error (common on Mac Safari if not PWA)
            if (subscribeError.message?.includes('push service not available')) {
              toast.error('Push notifications requires "Add to Home Screen" on Safari.', {
                description: 'Tap Share -> Add to Home Screen to enable real-time alerts on your laptop or iPhone.',
                duration: 10000
              })
              return
            }
            throw subscribeError
          }
        }

        if (!subscription) return

        // Send subscription to server
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        const token = session?.access_token

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ subscription })
        })

        if (res.ok) {
          console.log('Push subscription successful')
        }
      } catch (error: any) {
        console.error('Error registering push:', error)
      }
    }

    registerPush()
  }, [user])

  return null
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
