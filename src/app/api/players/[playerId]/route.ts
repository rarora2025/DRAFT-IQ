import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const { playerId } = await params
    const supabase = await createClient()

    // 1. Fetch player info - Try UUID first, then external_id
    let playerQuery = supabase.from('players').select('*')
    
    // Check if playerId is a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId)
    
    if (isUUID) {
      playerQuery = playerQuery.eq('id', playerId)
    } else {
      playerQuery = playerQuery.eq('external_id', playerId)
    }

    const { data: player, error: playerError } = await playerQuery.single()

    if (playerError || !player) {
      // One last try: if not UUID, try external_id even if it doesn't look like a UUID
      if (isUUID) {
        const { data: playerByExtId } = await supabase
          .from('players')
          .select('*')
          .eq('external_id', playerId)
          .single()
        
        if (playerByExtId) {
          return handlePlayerData(playerByExtId, supabase)
        }
      }
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return handlePlayerData(player, supabase)
  } catch (error) {
    console.error('Player API error:', error)
    return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 })
  }
}

async function handlePlayerData(player: any, supabase: any) {
  const playerId = player.id

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
  const propIds = props?.map((p: any) => p.id) || []
  let history: any[] = []
  
  if (propIds.length > 0) {
    const { data: historyData, error: historyError } = await supabase
      .from('prop_price_history')
      .select('*')
      .in('prop_id', propIds)
      .order('timestamp', { ascending: false })
      .limit(1000)
    
    if (historyError) {
      console.error('Error fetching history:', historyError)
    } else {
      // Sort back to ascending for the chart
      history = (historyData || []).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    }
  }

  return NextResponse.json({
    player,
    props: props || [],
    history: history || []
  })
}
