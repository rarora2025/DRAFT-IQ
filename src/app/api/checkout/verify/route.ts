import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const coins = session.metadata?.coins ? parseInt(session.metadata.coins, 10) : null

    return NextResponse.json({
      paid: true,
      coins,
      packageId: session.metadata?.packageId,
    })
  } catch (error: any) {
    console.error('[Checkout Verify] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
