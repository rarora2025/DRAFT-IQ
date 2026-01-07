import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

export async function POST(req: NextRequest) {
  const supabase = getServiceRoleClient()

  try {
    const { data: participants, error: participantsError } = await supabase
      .from('contest_participants')
      .select('id, user_id, initial_balance')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    if (participantsError) throw participantsError
    if (!participants || participants.length === 0) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    const userIds = participants.map(p => p.user_id)
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, balance')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const { data: allPositions } = await supabase
      .from('positions')
      .select('id, user_id, side, quantity, entry_price, player_prop_id')
      .in('user_id', userIds)
      .is('closed_at', null)

    const propIds = [...new Set((allPositions || []).map(p => p.player_prop_id).filter(Boolean))]
    
    const { data: props } = propIds.length > 0 ? await supabase
      .from('player_props')
      .select('id, current_value, line')
      .in('id', propIds) : { data: [] }

    const propMap = new Map((props || []).map(p => [p.id, p]))

    const positionsByUser = new Map<string, typeof allPositions>()
    for (const pos of allPositions || []) {
      if (!positionsByUser.has(pos.user_id)) {
        positionsByUser.set(pos.user_id, [])
      }
      positionsByUser.get(pos.user_id)!.push(pos)
    }

    const updates: { id: string; cached_portfolio_value: number }[] = []
    const now = new Date().toISOString()

    for (const participant of participants) {
      const profile = profileMap.get(participant.user_id)
      const positions = positionsByUser.get(participant.user_id) || []

      let positionsValue = 0
      for (const pos of positions) {
        const pp = propMap.get(pos.player_prop_id)
        const currentPrice = pp?.current_value || pp?.line || pos.entry_price || 0
        if (pos.side === 'long') {
          positionsValue += Number(pos.quantity) * Number(currentPrice)
        } else if (pos.side === 'short') {
          positionsValue += Number(pos.quantity) * (2 * Number(pos.entry_price) - Number(currentPrice))
        }
      }

      const cashBalance = Number(profile?.balance || 0)
      const totalValue = cashBalance + positionsValue

      updates.push({
        id: participant.id,
        cached_portfolio_value: totalValue
      })
    }

    for (const update of updates) {
      await supabase
        .from('contest_participants')
        .update({ 
          cached_portfolio_value: update.cached_portfolio_value,
          cached_at: now
        })
        .eq('id', update.id)
    }

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error: any) {
    console.error('Error refreshing contest values:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
