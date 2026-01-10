import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '24h'
    
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

    const now = new Date()
    let thresholdDate = new Date()
    if (timeframe === '24h') thresholdDate.setHours(now.getHours() - 24)
    else if (timeframe === '7d') thresholdDate.setDate(now.getDate() - 7)
    else if (timeframe === '30d') thresholdDate.setDate(now.getDate() - 30)
    else thresholdDate = new Date(0)

    const thresholdISO = thresholdDate.toISOString()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, created_at')

    const { data: recentEvents } = await supabase
      .from('events')
      .select('user_id, event_name, created_at')
      .gte('created_at', thresholdISO)

    const query = supabase
      .from('events')
      .select('user_id, event_name, created_at')
      .in('event_name', ['user_logon', 'trade_opened', 'trade_closed'])
    
    if (timeframe !== 'all') {
      query.gte('created_at', thresholdISO)
    }

    const { data: allEvents } = await query

    const { data: tradesData } = await supabase
      .from('trades')
      .select('user_id, created_at')
    
    const tradesInTimeframe = (tradesData || []).filter(t => 
      timeframe === 'all' || new Date(t.created_at) >= thresholdDate
    )

    const totalUsers = profiles?.length || 0
    const activeUserIds = new Set(recentEvents?.filter(e => e.event_name === 'user_logon').map(e => e.user_id))
    
    const tradingUserIds = new Set(tradesInTimeframe.map(t => t.user_id))

    const stats = {
      activePercent: totalUsers > 0 ? (activeUserIds.size / totalUsers) * 100 : 0,
      tradingPercent: totalUsers > 0 ? (tradingUserIds.size / totalUsers) * 100 : 0,
      activeCount: activeUserIds.size,
      tradingCount: tradingUserIds.size,
      totalUsers
    }

    const userMap = new Map()
    
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    const emailMap = new Map()
    authUsers?.forEach(au => {
      emailMap.set(au.id, au.email)
    })

    profiles?.forEach(p => {
      userMap.set(p.id, {
        id: p.id,
        username: p.username || 'Anonymous',
        email: emailMap.get(p.id) || 'No Email',
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
      }
    })

    tradesInTimeframe.forEach(t => {
      const userData = userMap.get(t.user_id)
      if (userData) userData.totalTrades++
    })

    const userList = Array.from(userMap.values())

    return NextResponse.json({ stats, users: userList })
  } catch (error: any) {
    console.error('Error in /api/analytics/summary:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
