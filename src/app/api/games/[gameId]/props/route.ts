import { NextRequest, NextResponse } from 'next/server'
import { fetchPlayerProps } from '@/lib/sportsData'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = (searchParams.get('sport') as 'NFL' | 'NBA') || 'NFL'
    const { gameId } = params
    
    const props = await fetchPlayerProps(gameId, sport)
    
    return NextResponse.json({ props })
  } catch (error) {
    console.error('Error fetching player props:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player props' },
      { status: 500 }
    )
  }
}
