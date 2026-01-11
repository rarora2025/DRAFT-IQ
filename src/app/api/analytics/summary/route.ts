import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
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

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .limit(40000)

    const { data: allTrades } = await supabase
      .from('trades')
      .select('user_id, action, created_at')
      .order('created_at', { ascending: false })
      .limit(100000)

    const { data: logonEvents } = await supabase
      .from('events')
      .select('user_id, event_name, created_at')
      .in('event_name', ['user_logon', 'app_open'])
      .order('created_at', { ascending: false })
      .limit(40000)

    const { data: recentTradesData } = await supabase
      .from('trades')
      .select('id, user_id, action, created_at, amount, prop_id')
      .order('created_at', { ascending: false })
      .limit(50)

    const profilesMap = new Map()
    profiles?.forEach(p => profilesMap.set(p.id, p.username || 'Anonymous'))

    const recentTrades = (recentTradesData || []).map(t => ({
      ...t,
      username: profilesMap.get(t.user_id) || 'Anonymous'
    }))

    const totalUsers = profiles?.length || 0
    
    const tradingUserIds = new Set((allTrades || []).map(t => t.user_id))
    const activeUserIds = new Set([
      ...(logonEvents || []).map(e => e.user_id),
      ...tradingUserIds
    ])

    const stats = {
      activePercent: totalUsers > 0 ? (activeUserIds.size / totalUsers) * 100 : 0,
      tradingPercent: totalUsers > 0 ? (tradingUserIds.size / totalUsers) * 100 : 0,
      activeCount: activeUserIds.size,
      tradingCount: tradingUserIds.size,
      totalUsers
    }

    const userMap = new Map()
    
    const allAuthUsers: any[] = []
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
        lastLogon: authData?.lastSignIn || null,
        totalLogons: 0,
        totalTrades: 0
      })
    })

    const userTradeCount = new Map<string, number>()
    ;(allTrades || []).forEach(t => {
      userTradeCount.set(t.user_id, (userTradeCount.get(t.user_id) || 0) + 1)
    })

    userTradeCount.forEach((count, userId) => {
      const userData = userMap.get(userId)
      if (userData) {
        userData.totalTrades = count
      }
    })

    ;(logonEvents || []).forEach(e => {
      const userData = userMap.get(e.user_id)
      if (!userData) return
      userData.totalLogons++
      const eventDate = new Date(e.created_at)
      if (!userData.lastLogon || eventDate > new Date(userData.lastLogon)) {
        userData.lastLogon = e.created_at
      }
    })

    const userList = Array.from(userMap.values())

    return NextResponse.json({ stats, users: userList, recentTrades })
  } catch (error: any) {
    console.error('Error in /api/analytics/summary:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
