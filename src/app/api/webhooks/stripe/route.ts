import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServiceRoleClient } from '@/lib/supabase-server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[Webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent

    // Skip if already credited by the confirm endpoint
    if (pi.metadata.credited === 'true') {
      return NextResponse.json({ received: true })
    }

    const userId = pi.metadata.userId
    const coinsToAdd = parseInt(pi.metadata.coinsToAdd || '0')

    if (userId && coinsToAdd > 0) {
      const supabase = getServiceRoleClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            balance: Number(profile.balance) + coinsToAdd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        await stripe.paymentIntents.update(pi.id, {
          metadata: { ...pi.metadata, credited: 'true' },
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
