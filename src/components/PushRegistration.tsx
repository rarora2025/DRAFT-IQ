'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function PushRegistration() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    async function registerPush() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported')
        return
      }

      try {
        const registration = await navigator.serviceWorker.ready
        
        // Request permission if not already granted
        if (Notification.permission === 'default') {
          await Notification.requestPermission()
        }

        if (Notification.permission !== 'granted') {
          console.warn('Push permission not granted')
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

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          })
        }

        // Send subscription to server
        const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
        const token = session?.access_token

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ subscription })
        })
      } catch (error) {
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
