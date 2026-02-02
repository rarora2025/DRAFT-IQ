import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createClient()

    // 1. Search players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        id, 
        name, 
        team, 
        sport,
        photo_url
      `)
      .or(`name.ilike.%${query}%,team.ilike.%${query}%`)
      .limit(10)

    if (playersError) console.error('Players search error:', playersError)

    // 2. Search games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select(`
        id,
        home_team,
        away_team,
        status,
        game_time,
        sport
      `)
      .neq('status', 'completed')
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%`)
      .limit(5)

    if (gamesError) console.error('Games search error:', gamesError)

    const playerResults = (players || []).map(p => ({
      type: 'player',
      id: p.id,
      image: p.photo_url,
      title: p.name,
      subtitle: p.team || '',
      href: `/players/${p.id}`
    }))

    const gameResults = (games || []).map(g => ({
      type: 'game',
      id: g.id,
      title: `${g.away_team} vs ${g.home_team}`,
      subtitle: `${g.status.toUpperCase()} • ${new Date(g.game_time).toLocaleDateString()}`,
      href: `/markets/${g.id}?sport=${g.sport === 'NBA' ? 'basketball_nba' : 'americanfootball_nfl'}`
    }))

    return NextResponse.json({ results: [...gameResults, ...playerResults] })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
