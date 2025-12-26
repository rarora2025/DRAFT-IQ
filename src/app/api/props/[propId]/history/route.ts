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
    .order('timestamp', { ascending: true })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter history based on 15m/1m windows to ensure clean graph
  const oneMin = 60 * 1000;
  const fifteenMins = 15 * 60 * 1000;
  const filteredData = [];
  const seenWindows = new Set();

  for (const point of (data || [])) {
    const ts = new Date(point.timestamp).getTime();
    const window = isLive ? Math.floor(ts / oneMin) : Math.floor(ts / fifteenMins);
    
    if (!seenWindows.has(window)) {
      seenWindows.add(window);
      filteredData.push(point);
    }
  }

  return NextResponse.json({ 
    history: filteredData.map(h => ({
      time: h.timestamp,
      value: h.price
    }))
  })
}
