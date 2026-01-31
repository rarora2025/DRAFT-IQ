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
        .or(`name.ilike.%${query}%,team.ilike.%${query}%`)
        .limit(10)

    if (playersError) console.error('Players search error:', playersError)

    const formattedResults = (players || []).map(p => {
      // Find the most relevant game (live or upcoming)
      const activeProp = p.player_props?.find((pp: any) => 
        pp.games?.status === 'live' || pp.games?.status === 'upcoming'
      )
      
      return {
        type: 'player',
        id: p.id,
        image: p.photo_url,
        title: p.name,
        subtitle: p.team || '',
        href: `/players/${p.id}`
      }
    })

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
