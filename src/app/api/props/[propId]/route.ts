import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { propId: string } }
) {
  const { propId } = await params

  try {
    // 1. Fetch current prop to see game_id
    const { data: prop, error } = await supabase
      .from('player_props')
      .select('*, players(*)')
      .eq('id', propId)
      .single()

    if (error) throw error

    // 2. TRIGGER MINI-SYNC if stale (> 10 seconds)
    // This ensures that when the user clicks 'Trade', the price check actually gets fresh data from the API
    const lastUpdate = prop.updated_at ? new Date(prop.updated_at).getTime() : 0
    const now = Date.now()
    const isStale = (now - lastUpdate) > 10 * 1000

    if (isStale && prop.game_id && prop.status !== 'LOCKED' && prop.status !== 'SETTLED') {
      console.log(`[PropAPI] Prop ${propId} is stale. Triggering mini-sync for game ${prop.game_id}`);
      
      // We call the sync route internally/background
      // Using an absolute URL or just fetch with relative path if hosted
      // For now, we'll use a direct internal fetch to /api/sync
      const origin = new URL(request.url).origin;
      try {
        await fetch(`${origin}/api/sync?gameId=${prop.game_id}&force=true`, {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}` // Optional if sync allows internal
          }
        });
        
        // Fetch again after sync
        const { data: freshProp } = await supabase
          .from('player_props')
          .select('*, players(*)')
          .eq('id', propId)
          .single()
        
        if (freshProp) return NextResponse.json({ prop: freshProp })
      } catch (syncErr) {
        console.error('[PropAPI] Mini-sync failed:', syncErr);
      }
    }

    return NextResponse.json({ prop })
  } catch (error) {
    console.error('Error fetching prop:', error)
    return NextResponse.json({ error: 'Failed to fetch prop' }, { status: 500 })
  }
}
