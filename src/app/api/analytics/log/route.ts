import { NextResponse } from 'next/server'
import { logEvent, EventName } from '@/lib/analytics'

export async function POST(req: Request) {
  try {
    const { eventName, userId, marketId, properties } = await req.json()

    // Validate event name
    const validEvents: EventName[] = [
      'market_viewed',
      'trade_opened',
      'reference_updated',
      'trade_closed',
      'user_returned_same_game'
    ]

    if (!validEvents.includes(eventName)) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 })
    }

    await logEvent(eventName, userId, marketId, properties)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/analytics/log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
