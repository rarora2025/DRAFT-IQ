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
        .limit(10000)

      const { data: recentEvents } = await supabase
        .from('events')
        .select('user_id, event_name, created_at')
        .gte('created_at', thresholdISO)
        .limit(20000)

      const query = supabase
        .from('events')
        .select('user_id, event_name, created_at')
        .in('event_name', ['user_logon', 'trade_opened', 'trade_closed', 'app_open'])
        .order('created_at', { ascending: false })
        .limit(20000)
    
      if (timeframe !== 'all') {
        query.gte('created_at', thresholdISO)
      }

      const { data: allEvents } = await query

      const totalUsers = profiles?.length || 0
      const activeUserIds = new Set(recentEvents?.filter(e => 
        ['user_logon', 'trade_opened', 'trade_closed', 'app_open'].includes(e.event_name)
      ).map(e => e.user_id))
      
      // Count trades from events (both opened and closed) to be more accurate
      const tradingEvents = allEvents?.filter(e => ['trade_opened', 'trade_closed'].includes(e.event_name)) || []
      const tradingUserIds = new Set(tradingEvents.map(e => e.user_id))

      const stats = {
        activePercent: totalUsers > 0 ? (activeUserIds.size / totalUsers) * 100 : 0,
        tradingPercent: totalUsers > 0 ? (tradingUserIds.size / totalUsers) * 100 : 0,
        activeCount: activeUserIds.size,
        tradingCount: tradingUserIds.size,
        totalUsers
      }

      const userMap = new Map()
      
      // Fetch ALL auth users to avoid pagination issues (default is 50)
      const allAuthUsers = []
      let page = 1
      while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
        if (listError || !users || users.length === 0) break
        allAuthUsers.push(...users)
        if (users.length < 1000) break
        page++
      }

      const authUsersMap = new Map()
      allAuthUsers.forEach(au => {
        authUsersMap.set(au.id, {
          email: au.email,
          lastSignIn: au.last_sign_in_at
        })
      })


    profiles?.forEach(p => {
      const authData = authUsersMap.get(p.id)
      userMap.set(p.id, {
        id: p.id,
        username: p.username || 'Anonymous',
        email: authData?.email || 'No Email',
        joinedAt: p.created_at,
        lastLogon: authData?.lastSignIn || null, // Use Auth sign-in as fallback
        totalLogons: 0,
        totalTrades: 0
      })
    })

    // Process events in reverse (oldest to newest) to correctly count and set last logon
    const sortedEvents = [...(allEvents || [])].reverse()
    sortedEvents.forEach(e => {
      const userData = userMap.get(e.user_id)
      if (!userData) return

      if (e.event_name === 'user_logon' || e.event_name === 'app_open') {
        userData.totalLogons++
        const eventDate = new Date(e.created_at)
        if (!userData.lastLogon || eventDate > new Date(userData.lastLogon)) {
          userData.lastLogon = e.created_at
        }
      }

      if (e.event_name === 'trade_opened' || e.event_name === 'trade_closed') {
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
