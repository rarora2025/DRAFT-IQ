import { NextRequest, NextResponse } from 'next/server'
import { fetchLiveGames } from '@/lib/sportsData'

export async function GET(request: NextRequest) {
  try {
    const games = await fetchLiveGames()
    
    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
