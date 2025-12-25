import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format')
    
    // Admin check
    const adminId = process.env.ADMIN_USER_ID
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID not configured' }, { status: 500 })
    }

    const supabase = getServiceRoleClient()
    
    // For simplicity, we assume the requester is authenticated as admin if they provide the admin session token
    // In a real app, we'd verify the JWT and check the sub.
    // Since we're asked to block all other users, we'll check the session.
    
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
        // Fallback to cookie check for browser requests
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || user.id !== adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user || user.id !== adminId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

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
          'Content-Disposition': 'attachment; filename=analytics_events.csv'
        }
      })
    }

    return NextResponse.json({ events })
  } catch (error: any) {
    console.error('Error in /api/analytics/events:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
