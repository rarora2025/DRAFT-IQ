import { NextResponse } from 'next/server'
import { getMarkets, getEvents } from '@/lib/kalshi'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '50'
  const status = searchParams.get('status') as 'open' | 'closed' | 'settled' | undefined
  const series_ticker = searchParams.get('series_ticker') || undefined
  
  try {
    const data = await getMarkets({
      limit: parseInt(limit),
      status: status || 'open',
      series_ticker
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch markets:', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}
