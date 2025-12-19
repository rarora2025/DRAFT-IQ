import { NextRequest, NextResponse } from 'next/server'
import { fetchPlayerProps } from '@/lib/sportsData'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// In-memory cache for last recorded time to avoid spamming DB
const lastRecorded: Record<string, number> = {}

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = params
    const props = await fetchPlayerProps(gameId)
    
    const now = Date.now()
    const lastTime = lastRecorded[gameId] || 0
    
    // Record history every 2 minutes
    if (now - lastTime > 120000) {
      lastRecorded[gameId] = now
      
      const historyPoints = props.map((p: any) => ({
        prop_id: p.id,
        price: p.current_value,
        timestamp: new Date().toISOString()
      }))

      // Batch insert into Supabase
      if (historyPoints.length > 0) {
        await supabase.from('prop_price_history').insert(historyPoints)
      }
    }
    
    return NextResponse.json({ props })
  } catch (error) {
    console.error('Error fetching player props:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player props' },
      { status: 500 }
    )
  }
}
