import { NextRequest, NextResponse } from 'next/server'
import { getGames } from '@/lib/oddsApi'

export async function GET(request: NextRequest) {
  try {
    const nbaGames = await getGames('basketball_nba')
    const nflGames = await getGames('americanfootball_nfl')
    
    const allGames = [...nbaGames, ...nflGames]
      .filter(game => !game.completed)
      .map(game => ({
        id: game.id,
        sport: game.sport_key.includes('nba') ? 'NBA' : 'NFL',
        home_team: game.home_team,
        away_team: game.away_team,
        game_time: game.commence_time,
        status: game.scores && game.scores.length > 0 ? 'live' : 'upcoming',
        home_score: game.scores?.find(s => s.name === game.home_team)?.score || '0',
        away_score: game.scores?.find(s => s.name === game.away_team)?.score || '0',
        sport_key: game.sport_key
      }))

    return NextResponse.json({ games: allGames })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
