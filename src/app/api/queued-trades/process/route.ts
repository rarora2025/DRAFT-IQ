import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

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
        const isLong = trade.side === 'long'
        
        let shouldExecute = false
        if (isLong) {
          if (new_price <= submittedPrice) shouldExecute = true
          else if (limitPrice && new_price <= limitPrice) shouldExecute = true
        } else {
          if (new_price >= submittedPrice) shouldExecute = true
          else if (limitPrice && new_price >= limitPrice) shouldExecute = true
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

          await supabase
            .from('queued_trades')
            .update({
              status: 'filled',
              filled_at: new Date().toISOString(),
              filled_price: new_price,
            })
            .eq('id', trade.id)

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

          await supabase
            .from('queued_trades')
            .update({
              status: 'filled',
              filled_at: new Date().toISOString(),
              filled_price: new_price,
            })
            .eq('id', trade.id)

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
