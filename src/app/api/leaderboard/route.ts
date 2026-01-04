import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, balance, daily_start_value, last_reset_at')

    if (usersError) throw usersError

    const now = new Date()
    const todayDateStr = now.toISOString().split('T')[0]

    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const { data: positions } = await supabase
          .from('positions')
          .select(`
            id, side, quantity, entry_price, player_prop_id, market_ticker,
            player_props:player_prop_id (current_value, line)
          `)
          .eq('user_id', user.id)
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

        const { data: pendingTrades } = await supabase
          .from('queued_trades')
          .select('size')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .eq('trade_type', 'open')

        const pendingValue = pendingTrades?.reduce((sum, t) => sum + Number(t.size), 0) || 0

        const totalValue = Number(user.balance) + positionsValue + pendingValue
        
        const lastResetDateStr = user.last_reset_at 
          ? new Date(user.last_reset_at).toISOString().split('T')[0] 
          : null
        const isResetToday = lastResetDateStr === todayDateStr
        
        let dailyStartValue = Number(user.daily_start_value) || 1000
        
        if (!isResetToday) {
          dailyStartValue = totalValue
          await supabase
            .from('profiles')
            .update({ 
              daily_start_value: totalValue,
              last_reset_at: now.toISOString()
            })
            .eq('id', user.id)
        }

        const dailyPercentGain = dailyStartValue > 0 
          ? ((totalValue - dailyStartValue) / dailyStartValue) * 100 
          : 0

        const totalPercentGain = ((totalValue - 1000) / 1000) * 100

        return {
          id: user.id,
          username: user.username,
          balance: Number(user.balance),
          total_value: totalValue,
          daily_start_value: dailyStartValue,
          daily_percent_gain: dailyPercentGain,
          total_percent_gain: totalPercentGain,
        }
      })
    )

    return NextResponse.json({ 
      leaderboard: leaderboard.filter(u => u.username),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
