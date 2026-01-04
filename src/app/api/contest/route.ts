import { NextRequest, NextResponse } from 'next/server'
import { createClient, getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

export async function GET() {
  try {
    const supabase = getServiceRoleClient()
    
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    if (contestError) throw contestError

    const { data: dailyWindows } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .order('start_time', { ascending: true })

    const { data: dailyWinnersRaw } = await supabase
      .from('contest_daily_winners')
      .select('id, user_id, daily_return, portfolio_value, daily_window_id')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    const winnerUserIds = (dailyWinnersRaw || []).map(w => w.user_id)
    const { data: winnerProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', winnerUserIds.length > 0 ? winnerUserIds : ['none'])
    
    const winnerProfileMap = new Map((winnerProfiles || []).map(p => [p.id, p]))
    const windowMap = new Map((dailyWindows || []).map(w => [w.id, w]))

    const dailyWinners = (dailyWinnersRaw || []).map(w => ({
      ...w,
      profiles: winnerProfileMap.get(w.user_id),
      daily_window: windowMap.get(w.daily_window_id)
    }))

    const { count: participantCount } = await supabase
      .from('contest_participants')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    return NextResponse.json({
      contest: {
        ...contest,
        daily_windows: dailyWindows || [],
        participant_count: participantCount || 0,
        daily_winners: dailyWinners
      }
    })
  } catch (error) {
    console.error('Error fetching contest:', error)
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingParticipant } = await serviceSupabase
      .from('contest_participants')
      .select('id')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('user_id', userId)
      .single()

    if (existingParticipant) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already enrolled',
        participant_id: existingParticipant.id
      })
    }

    const { data: contest } = await serviceSupabase
      .from('contests')
      .select('status')
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    if (!contest || contest.status !== 'live') {
      return NextResponse.json({ error: 'Contest is not active' }, { status: 400 })
    }

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single()

    const { data: positions } = await serviceSupabase
      .from('positions')
      .select('id, side, quantity, entry_price, player_prop_id')
      .eq('user_id', userId)
      .is('closed_at', null)

    let positionsValue = 0
    if (positions && positions.length > 0) {
      const propIds = positions.map(p => p.player_prop_id).filter(Boolean)
      const { data: props } = propIds.length > 0 ? await serviceSupabase
        .from('player_props')
        .select('id, current_value, line')
        .in('id', propIds) : { data: [] }
      
      const propMap = new Map((props || []).map(p => [p.id, p]))
      
      for (const pos of positions) {
        const pp = propMap.get(pos.player_prop_id)
        const currentPrice = pp?.current_value || pp?.line || pos.entry_price || 0
        if (pos.side === 'long') {
          positionsValue += Number(pos.quantity) * Number(currentPrice)
        } else if (pos.side === 'short') {
          positionsValue += Number(pos.quantity) * (2 * Number(pos.entry_price) - Number(currentPrice))
        }
      }
    }

    const currentPortfolioValue = Number(profile?.balance || 0) + positionsValue

    const { data: participant, error: insertError } = await serviceSupabase
      .from('contest_participants')
      .insert({
        contest_id: NFL_PLAYOFF_CONTEST_ID,
        user_id: userId,
        initial_balance: currentPortfolioValue,
        current_balance: currentPortfolioValue
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the NFL Playoff Challenge!',
      participant
    })
  } catch (error) {
    console.error('Error joining contest:', error)
    return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await serviceSupabase
      .from('contest_participants')
      .delete()
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('user_id', userId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Successfully left the challenge'
    })
  } catch (error) {
    console.error('Error leaving contest:', error)
    return NextResponse.json({ error: 'Failed to leave contest' }, { status: 500 })
  }
}
