import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Get active games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, sport')
      .in('status', ['live', 'upcoming'])
      .order('game_time', { ascending: true })
      .limit(5)

    if (gamesError) throw gamesError

    if (!games || games.length === 0) {
      return NextResponse.json({ players: [] })
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
        player:players (
          id,
          name,
          photo_url
        )
      `)
      .in('game_id', gameIds)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(30)

    if (propsError) throw propsError

    // 3. Get opening prices (first history entry) for these props
    const propIds = props.map(p => String(p.id))
    let historyMap: Record<string, number> = {}

    if (propIds.length > 0) {
      const historyPromises = propIds.map(async (propId) => {
        const { data } = await supabase
          .from('prop_price_history')
          .select('prop_id, price')
          .eq('prop_id', propId)
          .order('timestamp', { ascending: true })
          .limit(1)
          .maybeSingle()
        return data
      })
      
      const results = await Promise.all(historyPromises)
      results.forEach((h) => {
        if (h && h.prop_id && h.price !== undefined) {
          historyMap[h.prop_id] = h.price
        }
      })
    }

    // 4. Format and calculate % change
    let players = props
      .filter((p: any) => p.player && p.player.name)
      .map((p: any) => {
        const openingPrice = historyMap[String(p.id)] || p.line
        const changePercent = openingPrice > 0 
          ? ((p.current_value - openingPrice) / openingPrice) * 100 
          : 0

        return {
          id: p.id,
          name: p.player.name,
          pfp: p.player.photo_url,
          price: p.current_value,
          change: changePercent,
        }
      })
      .filter(p => Math.abs(p.change) >= 0) // Show all active props for now to ensure visibility
      .slice(0, 20)

    // Fallback if no active props
    if (players.length === 0) {
      players = [
        { id: '1', name: 'LeBron James', pfp: 'https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png', price: 28.5, change: 1.2 },
        { id: '2', name: 'Stephen Curry', pfp: 'https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png', price: 32.2, change: -0.5 },
        { id: '3', name: 'Patrick Mahomes', pfp: 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/v1725547634/nfl/v1/headshots/5c225381-e29f-431c-b25c-a567635a9821.png', price: 245.0, change: 2.1 },
        { id: '4', name: 'Luka Doncic', pfp: 'https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png', price: 35.8, change: 0.8 },
      ]
    }

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error in ticker API:', error)
    return NextResponse.json({ error: 'Failed to fetch ticker data' }, { status: 500 })
  }
}
