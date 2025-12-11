import { NextResponse } from 'next/server'
import { getEvents } from '@/lib/kalshi'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '20'
  const status = searchParams.get('status') as 'open' | 'closed' | 'settled' | undefined
  const series_ticker = searchParams.get('series_ticker') || undefined
  
  try {
    const data = await getEvents({
      limit: parseInt(limit),
      status: status || 'open',
      series_ticker,
      with_nested_markets: true
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
