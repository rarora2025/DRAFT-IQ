import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = await params
    const supabase = await createClient()

    // 1. Fetch player info
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // 2. Fetch all props for this player across all games
    const { data: props, error: propsError } = await supabase
      .from('player_props')
      .select(`
        *,
        games (
          id,
          external_id,
          home_team,
          away_team,
          game_time,
          status,
          sport
        )
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    if (propsError) {
      console.error('Error fetching player props:', propsError)
    }

    // 3. Fetch price history for all these props
    const propIds = props?.map(p => p.id) || []
    let history: any[] = []
    
    if (propIds.length > 0) {
      const { data: historyData, error: historyError } = await supabase
        .from('prop_price_history')
        .select('*')
        .in('prop_id', propIds)
        .order('timestamp', { ascending: true })
      
      if (historyError) {
        console.error('Error fetching history:', historyError)
      } else {
        history = historyData
      }
    }

    return NextResponse.json({
      player,
      props: props || [],
      history: history || []
    })
  } catch (error) {
    console.error('Player API error:', error)
    return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 })
  }
}
