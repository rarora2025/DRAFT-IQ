import { getServiceRoleClient } from './supabase-server'

export type EventName = 
  | 'trade_opened'
  | 'trade_closed'
  | 'user_logon'

export async function logEvent(
  eventName: EventName,
  userId?: string | null,
  marketId?: string | null,
  properties: Record<string, any> = {}
) {
  try {
    const supabase = getServiceRoleClient()
    const { error } = await supabase.from('events').insert({
      event_name: eventName,
      user_id: userId,
      market_id: marketId,
      properties
    })

    if (error) {
      console.error('Error logging event:', error)
    }
  } catch (err) {
    console.error('Failed to log event:', err)
  }
}
