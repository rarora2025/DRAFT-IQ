import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'sports_enabled')
      .single()

    if (error) throw error

    return NextResponse.json({ settings: data?.value || { NBA: true, NFL: true } })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ settings: { NBA: true, NFL: true } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminIds = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim().toLowerCase()) || []
    if (!adminIds.includes(user.id.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sport, enabled } = body

    if (!sport || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { data: current } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sports_enabled')
      .single()

    const currentSettings = current?.value || { NBA: true, NFL: true }
    const newSettings = { ...currentSettings, [sport]: enabled }

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'sports_enabled',
        value: newSettings,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true, settings: newSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
