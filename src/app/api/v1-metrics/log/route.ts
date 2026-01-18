import { NextResponse } from 'next/server'
import { logEvent, EventName } from '@/lib/metrics'

export async function POST(req: Request) {
  try {
    const { eventName, userId, marketId, properties } = await req.json()

    // Validate event name
    const validEvents: EventName[] = [
      'trade_opened',
      'trade_closed',
      'trade_queued',
      'market_viewed',
      'user_returned_same_game',
      'user_logon',
      'app_open'
    ]

    if (!validEvents.includes(eventName)) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 })
    }

    await logEvent(eventName, userId, marketId, properties)

    return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error in /api/v1-metrics/log:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
