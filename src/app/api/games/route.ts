import { NextRequest, NextResponse } from 'next/server'
import { fetchLiveGames } from '@/lib/sportsData'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = (searchParams.get('sport') as 'NFL' | 'NBA') || 'NFL'
    
    const games = await fetchLiveGames(sport)
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
