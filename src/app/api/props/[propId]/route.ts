import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: Request,
  { params }: { params: { propId: string } }
) {
  const { propId } = await params

  try {
    const supabase = await createClient()
    // 1. Fetch current prop to see game_id
    const { data: prop, error } = await supabase
      .from('player_props')
      .select('*, players(*)')
      .eq('id', propId)
      .single()

    if (error) throw error

    // 2. TRIGGER MINI-SYNC if stale (> 10 seconds)
    // For upcoming games, we ONLY trigger if it's actually the 15m mark
    const lastUpdate = prop.updated_at ? new Date(prop.updated_at).getTime() : 0
    const now = new Date()
    const nowMs = now.getTime()
    const isStale = (nowMs - lastUpdate) > 10 * 1000
    const isLive = prop.status === 'LIVE'

    if (isStale && prop.game_id && prop.status !== 'LOCKED' && prop.status !== 'SETTLED') {
      // ONLY trigger mini-sync for LIVE games. 
      // Upcoming games are strictly handled by the server on 15m intervals.
      if (isLive) {
        console.log(`[PropAPI] Prop ${propId} is stale. Triggering mini-sync for game ${prop.game_id}`);
        const origin = new URL(request.url).origin;
        try {
          await fetch(`${origin}/api/sync?gameId=${prop.game_id}&force=true`, {
            headers: {
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
          });
          
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
    }

    return NextResponse.json({ prop })
  } catch (error) {
    console.error('Error fetching prop:', error)
    return NextResponse.json({ error: 'Failed to fetch prop' }, { status: 500 })
  }
}
