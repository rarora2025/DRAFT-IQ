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
      .select('balance, last_login_at, iq_points')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const now = new Date()
    const lastLogin = profile.last_login_at ? new Date(profile.last_login_at) : null
    let newBalance = Number(profile.balance)
    let penaltyApplied = false

    // 2. Daily Login Penalty Logic
    if (lastLogin) {
      const diffMs = now.getTime() - lastLogin.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays >= 1) {
        // Penalty: -50 IQ per missed day (capped at some value if needed)
        const penalty = diffDays * 50
        newBalance = Math.max(0, newBalance - penalty)
        penaltyApplied = true
      }
    }

    // 3. Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_login_at: now.toISOString(),
        balance: newBalance,
        updated_at: now.toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      penaltyApplied,
      newBalance,
      lastLogin: profile.last_login_at
    })
  } catch (error: any) {
    console.error('[IQ Sync] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
