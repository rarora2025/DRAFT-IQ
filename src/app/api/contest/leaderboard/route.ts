import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const INITIAL_BALANCE = 1000

export async function GET() {
  try {
    const supabase = getServiceRoleClient()
    
    const { data: participants, error: participantsError } = await supabase
      .from('contest_participants')
      .select('id, user_id, initial_balance, joined_at')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    if (participantsError) throw participantsError

    const userIds = (participants || []).map(p => p.user_id)
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, balance')
      .in('id', userIds.length > 0 ? userIds : ['none'])
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const now = new Date()

    const { data: currentWindow } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())
      .single()

    const { data: dailySnapshots } = await supabase
      .from('contest_daily_snapshots')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('daily_window_id', currentWindow?.id || '')

    const snapshotMap = new Map(dailySnapshots?.map(s => [s.user_id, s]) || [])

    const leaderboard = await Promise.all(
      (participants || []).map(async (participant) => {
        const profile = profileMap.get(participant.user_id)
        
        const { data: positions } = await supabase
          .from('positions')
          .select('id, side, quantity, entry_price, player_prop_id')
          .eq('user_id', participant.user_id)
          .is('closed_at', null)

        let positionsValue = 0
        if (positions && positions.length > 0) {
          const propIds = positions.map(p => p.player_prop_id).filter(Boolean)
          const { data: props } = propIds.length > 0 ? await supabase
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

        const cashBalance = Number(profile?.balance || 0)
        const totalValue = cashBalance + positionsValue
        const initialBalance = Number(participant.initial_balance) || INITIAL_BALANCE
        const totalReturn = initialBalance > 0 
          ? ((totalValue - initialBalance) / initialBalance) * 100 
          : 0

        let dailyStartValue = totalValue
        let dailyReturn = 0
        
        const snapshot = snapshotMap.get(participant.user_id)
        if (snapshot) {
          dailyStartValue = Number(snapshot.start_value)
          dailyReturn = dailyStartValue > 0 
            ? ((totalValue - dailyStartValue) / dailyStartValue) * 100 
            : 0
        }

        return {
          id: participant.id,
          user_id: participant.user_id,
          username: profile?.username || 'Unknown',
          portfolio_value: totalValue,
          total_return: totalReturn,
          daily_start_value: dailyStartValue,
          daily_return: dailyReturn,
          joined_at: participant.joined_at
        }
      })
    )

    const overallLeaderboard = [...leaderboard].sort((a, b) => b.total_return - a.total_return)
    const dailyLeaderboard = [...leaderboard].sort((a, b) => b.daily_return - a.daily_return)

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

    return NextResponse.json({
      overall: overallLeaderboard,
      today: dailyLeaderboard,
      current_window: currentWindow,
      daily_windows: dailyWindows,
      daily_winners: dailyWinners,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching contest leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
