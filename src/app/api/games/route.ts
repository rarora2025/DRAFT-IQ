import { NextRequest, NextResponse } from 'next/server'
import { fetchLiveGames } from '@/lib/sportsData'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = (searchParams.get('sport') as string) || 'NBA'

    if (sport !== 'NBA') {
      return NextResponse.json({ error: 'Only NBA is supported' }, { status: 400 })
    }

    const games = await fetchLiveGames('NBA')
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
