import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Get active games (live or upcoming within 24 hours)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, status, sport_key')
      .or('status.eq.live,status.eq.upcoming')
      .lte('game_time', tomorrow.toISOString())

    if (gamesError) throw gamesError
    if (!games || games.length === 0) {
      return NextResponse.json({ risers: [], fallers: [] })
    }

    const gameIds = games.map(g => g.id)

    // 2. Get player props for these games
    const { data: props, error: propsError } = await supabase
      .from('player_props')
      .select(`
        id,
        line,
        current_value,
        prop_type,
        game_id,
        player:players (
          id,
          name,
          team,
          sport,
          photo_url
        )
      `)
      .in('game_id', gameIds)
      .not('current_value', 'is', null)

    if (propsError) throw propsError
    if (!props || props.length === 0) {
      return NextResponse.json({ risers: [], fallers: [] })
    }

    // 3. Get opening prices (first history entry) for these props
    const propIds = props.map(p => String(p.id))
    
    // To avoid too many queries, we'll fetch history for these propIds
    // and take the earliest one for each
    const { data: history, error: historyError } = await supabase
      .from('prop_price_history')
      .select('prop_id, price, timestamp')
      .in('prop_id', propIds)
      .order('timestamp', { ascending: true })

    if (historyError) throw historyError

    // Map prop_id to its opening price
    const openingPriceMap: Record<string, number> = {}
    history?.forEach(h => {
      if (!openingPriceMap[h.prop_id]) {
        openingPriceMap[h.prop_id] = h.price
      }
    })

    // 4. Calculate movements
    const movers = props
      .filter(p => p.player && p.player.name)
      .map(p => {
        const current = p.current_value || p.line
        const opening = openingPriceMap[p.id] || p.line
        const change = current - opening
        const changePercent = opening > 0 ? (change / opening) * 100 : 0
        
        return {
          id: p.id,
          player_name: p.player.name,
          team: p.player.team,
          sport: p.player.sport,
          photo_url: p.player.photo_url,
          prop_type: p.prop_type,
          current_value: current,
          opening_line: opening,
          change,
          changePercent,
          game_id: p.game_id,
          sport_key: games.find(g => g.id === p.game_id)?.sport_key
        }
      })
      .filter(m => Math.abs(m.changePercent) > 0.1) // Only show significant moves

    // 5. Sort and return top 5 of each
    const risers = [...movers]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5)

    const fallers = [...movers]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5)

    return NextResponse.json({
      risers,
      fallers
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      }
    })

  } catch (error) {
    console.error('Error fetching movers:', error)
    return NextResponse.json({ error: 'Failed to fetch movers' }, { status: 500 })
  }
}
