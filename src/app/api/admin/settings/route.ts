import { NextRequest, NextResponse } from 'next/server'
import { createClient, getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key') || 'sports_enabled'
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    const defaultValue = key === 'sports_enabled' ? { NBA: true, NFL: true } : { enabled: false }
    return NextResponse.json({ settings: data?.value || defaultValue })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ settings: { NBA: true, NFL: true } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = getServiceRoleClient()
    
    let user: any = null
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser

    if (!user) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: tokenUser } = await serviceSupabase.auth.getUser(token)
        user = tokenUser?.user
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const adminIds = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim().toLowerCase()) || []
    if (!adminIds.includes(user.id.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sport, enabled, key, value } = body

    let targetKey = key || 'sports_enabled'
    let newValue: any

    if (targetKey === 'sports_enabled' && sport) {
      const { data: current } = await serviceSupabase
        .from('app_settings')
        .select('value')
        .eq('key', 'sports_enabled')
        .single()
      const currentSettings = current?.value || { NBA: true, NFL: true }
      newValue = { ...currentSettings, [sport]: enabled }
    } else {
      newValue = value
    }

    const { error } = await serviceSupabase
      .from('app_settings')
      .upsert({
        key: targetKey,
        value: newValue,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true, settings: newValue })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
