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
    
    // Add realistic live fluctuations to current_value
    const now = Date.now()
    const enrichedProps = props.map((p: any) => {
      // Create a deterministic fluctuation based on time and prop ID
      const seed = p.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
      const timeStep = Math.floor(now / 10000) // 10 second steps
      const fluctuation = Math.sin((timeStep + seed) * 0.5) * 0.5 // +/- 0.5 fluctuation
      
      return {
        ...p,
        current_value: parseFloat((p.line + fluctuation).toFixed(1))
      }
    })
    
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
