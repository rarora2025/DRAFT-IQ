import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Get props with player info (including completed/ended)
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
      .not('player', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(60)

    if (propsError) throw propsError

    // 2. Get opening prices (first history entry) for these props
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

    // 3. Format and filter
    const allPlayers = props
      .filter((p: any) => 
        p.player && 
        p.player.name && 
        p.player.photo_url
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
      // Unique by player_id
      .reduce((acc: any[], curr: any) => {
        if (!acc.find(p => p.player_id === curr.player_id)) {
          acc.push(curr)
        }
        return acc
      }, [])

    const risers = [...allPlayers]
      .filter(p => p.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 3)

    const fallers = [...allPlayers]
      .filter(p => p.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 3)

    return NextResponse.json({ players: [...risers, ...fallers] })
  } catch (error) {
    console.error('Error in ticker API:', error)
    return NextResponse.json({ error: 'Failed to fetch ticker data' }, { status: 500 })
  }
}
