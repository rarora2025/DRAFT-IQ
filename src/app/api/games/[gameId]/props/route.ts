import { NextRequest, NextResponse } from 'next/server'
import { fetchPlayerProps } from '@/lib/sportsData'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = (searchParams.get('sport') as string) || 'NBA'
    const { gameId } = params
    
    if (sport !== 'NBA') {
      return NextResponse.json({ error: 'Only NBA is supported' }, { status: 400 })
    }

    const props = await fetchPlayerProps(gameId, 'NBA')
    
    return NextResponse.json({ props })
  } catch (error) {
    console.error('Error fetching player props:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player props' },
      { status: 500 }
    )
  }
}
