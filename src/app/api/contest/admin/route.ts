import { NextRequest, NextResponse } from 'next/server'
import { createClient, getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

async function verifyAdmin(request: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = getServiceRoleClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  let userId = user?.id
  
  if (!userId) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: tokenUser } = await serviceSupabase.auth.getUser(token)
      userId = tokenUser?.user?.id
    }
  }
  
  if (!userId) return null
  
  const adminIds = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim().toLowerCase()) || []
  if (!adminIds.includes(userId.toLowerCase())) return null
  
  return userId
}

export async function GET(request: NextRequest) {
  try {
    const adminId = await verifyAdmin(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceRoleClient()
    
    const { data: contest } = await supabase
      .from('contests')
      .select('*')
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    const { data: dailyWindows } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .order('start_time', { ascending: true })

    const { data: participants } = await supabase
      .from('contest_participants')
      .select('*, profiles:user_id(username)')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    const { data: dailyWinners } = await supabase
      .from('contest_daily_winners')
      .select('*, profiles:user_id(username), daily_window:daily_window_id(name)')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    return NextResponse.json({
      contest,
      daily_windows: dailyWindows,
      participants,
      daily_winners: dailyWinners
    })
  } catch (error) {
    console.error('Error fetching admin data:', error)
    return NextResponse.json({ error: 'Failed to fetch admin data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await verifyAdmin(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceRoleClient()
    const body = await request.json()
    const { action } = body

if (action === 'update_prize') {
        const { window_id, daily_window_id, prize_description } = body
        const targetWindowId = window_id || daily_window_id
      
      const { error } = await supabase
        .from('contest_daily_windows')
        .update({ prize_description })
        .eq('id', targetWindowId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'lock_day') {
      const { window_id } = body
      
      const { data: window } = await supabase
        .from('contest_daily_windows')
        .select('*')
        .eq('id', window_id)
        .single()

      if (!window) {
        return NextResponse.json({ error: 'Window not found' }, { status: 404 })
      }

      const { data: participants } = await supabase
        .from('contest_participants')
        .select('user_id, current_balance')
        .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

      const leaderboard = await Promise.all(
        (participants || []).map(async (p) => {
          const { data: positions } = await supabase
            .from('contest_positions')
            .select('*, player_props:player_prop_id(current_value, line)')
            .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
            .eq('user_id', p.user_id)
            .is('closed_at', null)

          let positionsValue = 0
          if (positions) {
            for (const pos of positions) {
              const pp = pos.player_props as any
              const currentPrice = pp?.current_value || pp?.line || pos.entry_price || 0
              if (pos.side === 'long') {
                positionsValue += Number(pos.quantity) * Number(currentPrice)
              } else if (pos.side === 'short') {
                positionsValue += Number(pos.quantity) * (2 * Number(pos.entry_price) - Number(currentPrice))
              }
            }
          }

          const totalValue = Number(p.current_balance) + positionsValue

          const { data: snapshot } = await supabase
            .from('contest_daily_snapshots')
            .select('start_value')
            .eq('daily_window_id', window_id)
            .eq('user_id', p.user_id)
            .single()

          const startValue = snapshot?.start_value || totalValue
          const dailyReturn = startValue > 0 ? ((totalValue - Number(startValue)) / Number(startValue)) * 100 : 0

          return {
            user_id: p.user_id,
            portfolio_value: totalValue,
            daily_return: dailyReturn
          }
        })
      )

      leaderboard.sort((a, b) => b.daily_return - a.daily_return)
      const winner = leaderboard[0]

      if (winner) {
        await supabase
          .from('contest_daily_winners')
          .upsert({
            contest_id: NFL_PLAYOFF_CONTEST_ID,
            daily_window_id: window_id,
            user_id: winner.user_id,
            daily_return: winner.daily_return,
            portfolio_value: winner.portfolio_value
          })
      }

      await supabase
        .from('contest_daily_windows')
        .update({ is_locked: true })
        .eq('id', window_id)

      return NextResponse.json({ success: true, winner })
    }

    if (action === 'complete_contest') {
      await supabase
        .from('contests')
        .update({ status: 'completed' })
        .eq('id', NFL_PLAYOFF_CONTEST_ID)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in admin action:', error)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}
