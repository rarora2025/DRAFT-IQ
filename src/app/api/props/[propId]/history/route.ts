import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: { propId: string } }
) {
  const { propId } = await params

  // Fetch game status to determine interval filtering
  const { data: propData } = await supabase
    .from('player_props')
    .select('game_id')
    .eq('id', propId)
    .single();

  let isLive = false;
  if (propData) {
    const { data: gameData } = await supabase
      .from('games')
      .select('status')
      .eq('id', propData.game_id)
      .single();
    isLive = gameData?.status === 'live';
  }

    const { data, error } = await supabase
      .from('prop_price_history')
      .select('price, timestamp')
      .eq('prop_id', propId)
      .order('timestamp', { ascending: false })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sortedData = (data || []).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Return raw history points - let the graph handle display
    return NextResponse.json({ 
      history: sortedData.map(h => ({
        time: h.timestamp,
        value: h.price
      }))
    })
}
