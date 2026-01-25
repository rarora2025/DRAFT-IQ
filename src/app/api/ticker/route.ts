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
        game_id,
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
      .in('status', ['active', 'LIVE', 'upcoming'])
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
      const players = props
        .filter((p: any) => 
          p.player && 
          p.player.name && 
          p.player.photo_url && 
          !p.player.photo_url.includes('jwszinypqjrebtprovuo')
        )
          .map((p: any) => {
            const currentPrice = p.current_value ?? p.line
            const openingPrice = historyMap[String(p.id)] || p.line
            const changePercent = openingPrice > 0 
              ? ((currentPrice - openingPrice) / openingPrice) * 100 
              : 0

            return {
              id: p.id,
              player_id: p.player.id,
              game_id: p.game_id,
              name: p.player.name,
              pfp: p.player.photo_url,
              price: currentPrice,
              change: changePercent,
            }
          })
        .slice(0, 20)

    return NextResponse.json({ players })
  } catch (error) {
    console.error('Error in ticker API:', error)
    return NextResponse.json({ error: 'Failed to fetch ticker data' }, { status: 500 })
  }
}
