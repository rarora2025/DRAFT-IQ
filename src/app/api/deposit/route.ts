import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json()
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum < 1 || amountNum > 1000) {
      return NextResponse.json({ error: 'Amount must be between $1 and $1,000' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const amountCents = Math.round(amountNum * 100)
    // $1 = 100 coins (maintains existing ratio)
    const coinsToAdd = amountCents

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: user.id,
        coinsToAdd: String(coinsToAdd),
        credited: 'false',
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: any) {
    console.error('[Deposit] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
