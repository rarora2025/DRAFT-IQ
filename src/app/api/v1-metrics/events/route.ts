import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    
    // Admin check
    const adminId = process.env.ADMIN_USER_ID
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID not configured' }, { status: 500 })
    }
    const adminIds = adminId.split(',').map(id => id.trim())

    const supabase = getServiceRoleClient()
    
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
        // Fallback to cookie check for browser requests
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !adminIds.includes(user.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user || !adminIds.includes(user.id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type === 'trades') {
      query = query.in('event_name', ['trade_opened', 'trade_closed'])
    } else if (type === 'logons') {
      query = query.eq('event_name', 'user_logon')
    }

    const { data: events, error, count } = await query

    if (error) throw error

    if (format === 'csv') {
      const headers = ['id', 'event_name', 'user_id', 'market_id', 'properties', 'created_at']
      const csvContent = [
        headers.join(','),
        ...(events || []).map(event => [
          event.id,
          event.event_name,
          event.user_id,
          event.market_id,
          `"${JSON.stringify(event.properties).replace(/"/g, '""')}"`,
          event.created_at
        ].join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=metrics_events.csv'
          }
        })
      }
  
      return NextResponse.json({ events, total: count })
    } catch (error: any) {
      console.error('Error in /api/v1-metrics/events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
