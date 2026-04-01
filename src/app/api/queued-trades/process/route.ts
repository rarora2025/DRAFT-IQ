import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

async function recordTradeToFeed(
  supabase: ReturnType<typeof getServiceRoleClient>, 
  userId: string, 
  tradeAmount: number,
  tradeDetails: { 
    player_name: string; 
    side: 'long' | 'short'; 
    status: 'active' | 'closed';
    pnl?: number;
    pnl_percent?: number;
    entry_price?: number;
    exit_price?: number;
    prop_type?: string;
    line?: number;
  }
) {
    try {
      // Post to the general feed (community)
      await supabase.from('contest_feed').insert({
        user_id: userId,
        type: 'trade',
        trade_amount: tradeAmount,
        trade_details: tradeDetails
      })
    } catch (error) {
    console.error('Error recording trade to feed:', error)
  }
}

export async function POST(req: NextRequest) {
  const supabase = getServiceRoleClient()

  try {
    const body = await req.json()
    const { player_prop_id, new_price } = body

    if (!player_prop_id || new_price === undefined) {
      return NextResponse.json({ error: 'Missing player_prop_id or new_price' }, { status: 400 })
    }

    const { data: prop } = await supabase
      .from('player_props')
      .select('id, status, game_id')
      .eq('id', player_prop_id)
      .single()

    if (!prop) {
      return NextResponse.json({ error: 'Prop not found' }, { status: 404 })
    }

      const { data: pendingTrades } = await supabase
        .from('queued_trades')
        .select('*')
        .eq('player_prop_id', player_prop_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!pendingTrades || pendingTrades.length === 0) {
        return NextResponse.json({ success: true, processed: 0 })
      }

      const userIds = [...new Set(pendingTrades.map(t => t.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, default_tolerance')
        .in('id', userIds)
      
      const userToleranceMap = new Map(
        (profiles || []).map(p => [p.id, p.default_tolerance ?? 5])
      )

      const isMarketLocked = prop.status === 'LOCKED' || prop.status === 'FROZEN' || prop.status === 'SETTLED' || prop.status === 'inactive'

      let processed = 0
      const results = []

        for (const trade of pendingTrades) {
          if (isMarketLocked) {
            results.push({ id: trade.id, status: 'skipped', reason: 'market_locked' })
            continue
          }

          const submittedPrice = Number(trade.submitted_price)
          const limitPrice = trade.limit_price ? Number(trade.limit_price) : null
          const tradeTolerance = trade.tolerance_percent != null ? Number(trade.tolerance_percent) : null
          const userDefaultTolerance = userToleranceMap.get(trade.user_id) ?? 5
          const isLong = trade.side === 'long'
          
          let shouldExecute = false
          if (!limitPrice) {
            // No limit price — market order, execute at current price unconditionally
            shouldExecute = true
          } else if (isLong) {
            // Limit order: execute only if price is at or better than the limit
            if (new_price <= limitPrice) shouldExecute = true
          } else {
            if (new_price >= limitPrice) shouldExecute = true
          }

          if (!shouldExecute) {
            results.push({ id: trade.id, status: 'skipped', reason: 'price_outside_limit' })
            continue
          }

        try {
        if (trade.trade_type === 'open') {
          const quantity = Number(trade.size) / new_price

          const { data: newPosition, error: posError } = await supabase
            .from('positions')
            .insert({
              user_id: trade.user_id,
              side: trade.side,
              size: trade.size,
              quantity,
              entry_price: new_price,
              entry_reference_value: new_price,
              player_prop_id: trade.player_prop_id,
              market_title: trade.market_title,
              market_ticker: trade.player_prop_id,
            })
            .select()
            .single()

          if (posError) throw posError

            await supabase.from('trades').insert({
              user_id: trade.user_id,
              position_id: newPosition.id,
              action: trade.side === 'long' ? 'buy' : 'sell',
              size: trade.size,
              price: new_price,
              market_title: trade.market_title,
            })

            await supabase.from('events').insert({
              event_name: 'trade_opened',
              user_id: trade.user_id,
              properties: { 
                position_id: newPosition.id, 
                side: trade.side, 
                size: trade.size,
                price: new_price 
              }
            })

          await supabase
            .from('queued_trades')
            .update({
              status: 'filled',
              filled_at: new Date().toISOString(),
              filled_price: new_price,
            })
            .eq('id', trade.id)

            /* 
              await recordTradeToFeed(supabase, trade.user_id, Number(trade.size), {
                player_name: trade.market_title || 'Unknown Player',
                side: trade.side as 'long' | 'short'
              })
            */

            await recordTradeToFeed(supabase, trade.user_id, Number(trade.size), {
              player_name: trade.market_title || 'Unknown Player',
              side: trade.side as 'long' | 'short',
              status: 'active',
              entry_price: new_price
            })

            results.push({ id: trade.id, status: 'filled', position_id: newPosition.id })
            processed++
          } else if (trade.trade_type === 'close') {
          const { data: position } = await supabase
            .from('positions')
            .select('*')
            .eq('id', trade.position_id)
            .is('closed_at', null)
            .single()

          if (!position) {
            await supabase
              .from('queued_trades')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancel_reason: 'position_already_closed',
              })
              .eq('id', trade.id)

            results.push({ id: trade.id, status: 'cancelled', reason: 'position_already_closed' })
            continue
          }

          const { data, error } = await supabase.rpc('close_trading_position', {
            p_position_id: trade.position_id,
            p_exit_price: new_price,
          })

            if (error) throw error

            await supabase.from('events').insert({
              event_name: 'trade_closed',
              user_id: trade.user_id,
              properties: { 
                position_id: trade.position_id, 
                exit_price: new_price,
                pnl: data?.pnl 
              }
            })

            await supabase
            .from('queued_trades')
            .update({
              status: 'filled',
              filled_at: new Date().toISOString(),
              filled_price: new_price,
            })
            .eq('id', trade.id)

            await recordTradeToFeed(supabase, trade.user_id, Number(position.size || 0), {
              player_name: position.market_title || 'Unknown Player',
              side: position.side as 'long' | 'short',
              status: 'closed',
              pnl: data?.pnl,
              exit_price: new_price,
              entry_price: position.entry_price
            })

            results.push({ id: trade.id, status: 'filled', pnl: data?.pnl })
          processed++
        }
      } catch (tradeError: any) {
        console.error(`Error processing queued trade ${trade.id}:`, tradeError)
        results.push({ id: trade.id, status: 'error', error: tradeError.message })
      }
    }

    return NextResponse.json({ success: true, processed, results })
  } catch (error: any) {
    console.error('Error processing queued trades:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
