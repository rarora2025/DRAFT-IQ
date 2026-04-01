import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json()
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Idempotency: if already credited, return success without crediting again
    if (pi.metadata.credited === 'true') {
      return NextResponse.json({
        success: true,
        alreadyCredited: true,
        coins: parseInt(pi.metadata.coinsToAdd || '0'),
      })
    }

    const userId = pi.metadata.userId
    const coinsToAdd = parseInt(pi.metadata.coinsToAdd || '0')

    if (!userId || !coinsToAdd) {
      return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 })
    }

    const supabase = getServiceRoleClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await supabase
      .from('profiles')
      .update({
        balance: Number(profile.balance) + coinsToAdd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // Mark as credited to prevent double-crediting
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { ...pi.metadata, credited: 'true' },
    })

    return NextResponse.json({ success: true, coins: coinsToAdd })
  } catch (error: any) {
    console.error('[Deposit Confirm] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
