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
        photo_url,
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
        image: `https://a.espncdn.com/i/teamlogos/${g.sport.toLowerCase().includes('nba') ? 'nba' : 'nfl'}/500/scoreboard/${g.away_team.toLowerCase().split(' ').pop()}.png`, // Fallback logic if needed, but I'll use a better one on client or here
        title: `${g.away_team} @ ${g.home_team}`,
        subtitle: g.status === 'live' ? 'Live Now' : 'Upcoming',
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
            image: p.photo_url,
            title: p.name,
            subtitle: p.team || '',
            href: `/players/${p.id}`
          }

      })
    ]

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
