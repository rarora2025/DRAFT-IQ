import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const serviceClient = getServiceRoleClient()

    // Get user email from auth
    const { data: authUser } = await serviceClient.auth.admin.getUserById(user.id)
    const email = authUser?.user?.email || null

    const { error } = await serviceClient
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount: Math.round(Number(amount) * 100), // store in cents
        status: 'pending',
        email,
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error submitting withdrawal request:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit request' }, { status: 500 })
  }
}
