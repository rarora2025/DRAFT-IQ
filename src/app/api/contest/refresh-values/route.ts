import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

export async function POST(req: NextRequest) {
  const supabase = getServiceRoleClient()

  try {
    const { data, error } = await supabase.rpc('refresh_contest_portfolio_values', {
      p_contest_id: NFL_PLAYOFF_CONTEST_ID
    })

    if (error) throw error

    return NextResponse.json({ success: true, updated: data })
  } catch (error: any) {
    console.error('Error refreshing contest values:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
