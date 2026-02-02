import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const supabase = getServiceRoleClient()

    // 1. Fetch profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('balance, last_claim_at')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const now = new Date()
    const lastClaim = profile.last_claim_at ? new Date(profile.last_claim_at) : null
    
    // Check if claimed today (UTC)
    if (lastClaim) {
      const isSameDay = lastClaim.getUTCFullYear() === now.getUTCFullYear() &&
                        lastClaim.getUTCMonth() === now.getUTCMonth() &&
                        lastClaim.getUTCDate() === now.getUTCDate()
      
      if (isSameDay) {
        return NextResponse.json({ error: 'Already claimed today' }, { status: 400 })
      }
    }

    const newBalance = (profile.balance || 0) + 50

    // 2. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        balance: newBalance,
        last_claim_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      newBalance,
      lastClaimAt: now.toISOString()
    })
  } catch (error: any) {
    console.error('[IQ Claim] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
