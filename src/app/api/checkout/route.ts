import { NextRequest, NextResponse } from 'next/server'
import { stripe, COIN_PACKAGES, CoinPackageId } from '@/lib/stripe'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { packageId } = await req.json()

    const pkg = COIN_PACKAGES.find((p) => p.id === packageId)
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pkg.price,
            product_data: {
              name: pkg.label,
              description: `Purchase ${pkg.coins.toLocaleString()} Draft Coins for DraftIQ`,
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        packageId: pkg.id,
        coins: String(pkg.coins),
      },
      success_url: `${origin}/rewards/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rewards/buy`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
