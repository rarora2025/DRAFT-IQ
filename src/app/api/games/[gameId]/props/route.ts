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
    const allProps = await fetchPlayerProps(gameId)
    
    // Filter to ONLY Fantasy Points in the API to speed up the frontend
    const props = allProps.filter((p: any) => 
      p.prop_type === 'Fantasy Points' || 
      p.prop_type?.toLowerCase().includes('fantasy')
    )
    
    // Use raw line value without simulated fluctuations
    const enrichedProps = props.map((p: any) => ({
      ...p,
      current_value: p.line
    }))
    
    const now = Date.now()
    const lastTime = lastRecorded[gameId] || 0
    
    // Record history every 30 seconds for more granular graphs
    if (now - lastTime > 30000) {
      lastRecorded[gameId] = now
      
      const historyPoints = enrichedProps.map((p: any) => ({
        prop_id: p.id,
        price: p.current_value,
        timestamp: new Date().toISOString()
      }))

      // Batch insert into Supabase
      if (historyPoints.length > 0) {
        await supabase.from('prop_price_history').insert(historyPoints)
      }
    }
    
    return NextResponse.json({ props: enrichedProps })
  } catch (error) {
    console.error('Error fetching player props:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player props' },
      { status: 500 }
    )
  }
}
