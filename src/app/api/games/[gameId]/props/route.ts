import { NextRequest, NextResponse } from 'next/server'
import { getEventOdds, Bookmaker, Market } from '@/lib/oddsApi'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params
    const searchParams = request.nextUrl.searchParams
    const sport = searchParams.get('sport') || 'basketball_nba'
    
    const odds = await getEventOdds(sport, gameId)
    
    // Pick the most updated bookmaker between FanDuel and DraftKings
    const bookmakers = odds.bookmakers || []
    const fd = bookmakers.find(b => b.key === 'fanduel')
    const dk = bookmakers.find(b => b.key === 'draftkings')
    
    let selectedBook: Bookmaker | undefined
    if (fd && dk) {
      selectedBook = new Date(fd.last_update) > new Date(dk.last_update) ? fd : dk
    } else {
      selectedBook = fd || dk
    }

    if (!selectedBook) {
      return NextResponse.json({ props: [], spreads: [], totals: [] })
    }

    const markets = selectedBook.markets || []
    
    const spreads = markets.find(m => m.key === 'spreads')?.outcomes || []
    const totals = markets.find(m => m.key === 'totals')?.outcomes || []
    const playerPoints = markets.find(m => m.key === 'player_points')?.outcomes || []

    // Group player points by description (player name) and pick the first one (Over/Under doesn't matter for the line)
    const uniquePlayers = new Map()
    playerPoints.forEach(outcome => {
      if (outcome.description && !uniquePlayers.has(outcome.description)) {
        uniquePlayers.set(outcome.description, {
          id: `${gameId}-${outcome.description}`.replace(/\s+/g, '-').toLowerCase(),
          player_name: outcome.description,
          line: outcome.point,
          prop_type: 'Points',
          last_update: selectedBook?.last_update
        })
      }
    })

    return NextResponse.json({
      props: Array.from(uniquePlayers.values()),
      spreads: spreads.map(s => ({ team: s.name, point: s.point })),
      totals: totals.map(t => ({ name: t.name, point: t.point })),
      last_update: selectedBook.last_update
    })
  } catch (error) {
    console.error('Error fetching player props:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player props' },
      { status: 500 }
    )
  }
}
