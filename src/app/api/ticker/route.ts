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
      .limit(300)

    if (propsError) throw propsError

    // 2. Get opening prices (first history entry) for these props
    const propIds = props.map(p => String(p.id))
    let historyMap: Record<string, number> = {}

    if (propIds.length > 0) {
      // Only fetch history from today to speed up daily mover calculation
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: historyData } = await supabase
        .from('prop_price_history')
        .select('prop_id, price')
        .in('prop_id', propIds)
        .gte('timestamp', today.toISOString())
        .order('timestamp', { ascending: true })

      if (historyData) {
        // Since we order by timestamp ASC, the first one we see for each prop_id is the opening price
        historyData.forEach((h) => {
          if (h.prop_id && h.price !== undefined && !historyMap[h.prop_id]) {
            historyMap[h.prop_id] = h.price
          }
        })
      }
    }

    // 3. Format and filter
    const allPropChanges = props
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
          prop_type: p.prop_type,
        }
      })

    // Group by player_id and keep the one with the largest magnitude change
    const playerMoversMap = new Map<string, any>()
    
    allPropChanges.forEach(p => {
      const existing = playerMoversMap.get(p.player_id)
      if (!existing || Math.abs(p.change) > Math.abs(existing.change)) {
        playerMoversMap.set(p.player_id, p)
      }
    })

    const movers = Array.from(playerMoversMap.values())
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 15)

    return NextResponse.json({ players: movers })
  } catch (error) {
    console.error('Error in ticker API:', error)
    return NextResponse.json({ error: 'Failed to fetch ticker data' }, { status: 500 })
  }
}
