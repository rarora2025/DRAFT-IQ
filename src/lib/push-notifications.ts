import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (error || !subscriptions) {
      console.error('Error fetching push subscriptions:', error)
      return
    }

    const pushPromises = subscriptions.map(sub => 
      webpush.sendNotification(
        sub.subscription,
        JSON.stringify(payload)
      ).catch(err => {
        if (err.statusCode === 410) {
          // Subscription has expired or is no longer valid, delete it
          return supabase
            .from('push_subscriptions')
            .delete()
            .match({ user_id: userId, subscription: sub.subscription })
        }
        console.error('Error sending push notification:', err)
      })
    )

    await Promise.all(pushPromises)
  } catch (error) {
    console.error('sendPushNotification error:', error)
  }
}
