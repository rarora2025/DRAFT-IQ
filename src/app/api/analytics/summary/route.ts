import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    
    // Admin check
    const adminId = process.env.ADMIN_USER_ID
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const adminIds = adminId.split(',').map(id => id.trim())

    const supabase = getServiceRoleClient()
    
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !adminIds.includes(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user || !adminIds.includes(user.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate time threshold
    const now = new Date()
    let thresholdDate = new Date()
    if (timeframe === '24h') thresholdDate.setHours(now.getHours() - 24)
    else if (timeframe === '7d') thresholdDate.setDate(now.getDate() - 7)
    else if (timeframe === '30d') thresholdDate.setDate(now.getDate() - 30)
    else thresholdDate = new Date(0) // All time

    const thresholdISO = thresholdDate.toISOString()

    // 1. Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, created_at')

    // 2. Fetch events for stats
    const { data: recentEvents } = await supabase
      .from('events')
      .select('user_id, event_name, created_at')
      .gte('created_at', thresholdISO)

    // 3. Fetch all events for the user table (this might be large, but let's aggregate)
    // For every user, we want: last logon, total logons, total trades
    const { data: allEvents } = await supabase
      .from('events')
      .select('user_id, event_name, created_at')
      .in('event_name', ['user_logon', 'trade_opened', 'trade_closed'])

    // Aggregate stats
    const totalUsers = profiles?.length || 0
    const activeUserIds = new Set(recentEvents?.filter(e => e.event_name === 'user_logon').map(e => e.user_id))
    const tradingUserIds = new Set(recentEvents?.filter(e => ['trade_opened', 'trade_closed'].includes(e.event_name)).map(e => e.user_id))

    const stats = {
      activePercent: totalUsers > 0 ? (activeUserIds.size / totalUsers) * 100 : 0,
      tradingPercent: totalUsers > 0 ? (tradingUserIds.size / totalUsers) * 100 : 0,
      activeCount: activeUserIds.size,
      tradingCount: tradingUserIds.size,
      totalUsers
    }

    // Aggregate user table data
    const userMap = new Map()
    profiles?.forEach(p => {
      userMap.set(p.id, {
        id: p.id,
        username: p.username || 'Anonymous',
        joinedAt: p.created_at,
        lastLogon: null,
        totalLogons: 0,
        totalTrades: 0
      })
    })

    allEvents?.forEach(e => {
      const userData = userMap.get(e.user_id)
      if (!userData) return

      if (e.event_name === 'user_logon') {
        userData.totalLogons++
        const eventDate = new Date(e.created_at)
        if (!userData.lastLogon || eventDate > new Date(userData.lastLogon)) {
          userData.lastLogon = e.created_at
        }
      } else if (['trade_opened', 'trade_closed'].includes(e.event_name)) {
        userData.totalTrades++
      }
    })

    const userList = Array.from(userMap.values())

    return NextResponse.json({ stats, users: userList })
  } catch (error: any) {
    console.error('Error in /api/analytics/summary:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
