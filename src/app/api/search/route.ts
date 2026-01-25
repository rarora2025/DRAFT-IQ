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

    // Search games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, external_id, home_team, away_team, sport, status')
      .or(`home_team.ilike.%${query}%,away_team.ilike.%${query}%,sport.ilike.%${query}%`)
      .in('status', ['live', 'upcoming'])
      .limit(5)

    // Search players and find their active games
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select(`
        id, 
        name, 
        team, 
        sport,
        player_props (
          game_id,
          games (
            external_id,
            status
          )
        )
      `)
      .ilike('name', `%${query}%`)
      .limit(5)

    if (gamesError) console.error('Games search error:', gamesError)
    if (playersError) console.error('Players search error:', playersError)

    const formattedResults = [
      ...(games || []).map(g => ({
        type: 'game',
        id: g.external_id,
        title: `${g.away_team} @ ${g.home_team}`,
        subtitle: g.sport,
        status: g.status,
        href: `/markets/${g.external_id}?sport=${g.sport === 'NBA' ? 'basketball_nba' : 'americanfootball_nfl'}`
      })),
      ...(players || []).map(p => {
        // Find the most relevant game (live or upcoming)
        const activeProp = p.player_props?.find((pp: any) => 
          pp.games?.status === 'live' || pp.games?.status === 'upcoming'
        )
        const gameId = activeProp?.games?.external_id
        
        return {
          type: 'player',
          id: p.id,
          title: p.name,
          subtitle: `${p.team || ''} ${p.sport}`,
          href: gameId 
            ? `/markets/${gameId}?sport=${p.sport === 'NBA' ? 'basketball_nba' : 'americanfootball_nfl'}&player=${p.id}`
            : `/markets?q=${encodeURIComponent(p.name)}`
        }
      })
    ]

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
