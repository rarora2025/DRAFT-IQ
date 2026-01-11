'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { QueuedTrade } from '@/lib/types'

export function useQueuedTrades(userId: string | undefined) {
  const [queuedTrades, setQueuedTrades] = useState<QueuedTrade[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueuedTrades = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase
      .from('queued_trades')
      .select('*, player_props(game_id, player_id)')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (data) {
      setQueuedTrades(
        data.map((t) => ({
          ...t,
          size: Number(t.size),
          submitted_price: Number(t.submitted_price),
          filled_price: t.filled_price ? Number(t.filled_price) : undefined,
          limit_price: t.limit_price ? Number(t.limit_price) : undefined,
            game_id: Array.isArray(t.player_props) ? t.player_props[0]?.game_id : (t.player_props as any)?.game_id,
            player_id: Array.isArray(t.player_props) ? t.player_props[0]?.player_id : (t.player_props as any)?.player_id,
          }))
        )
      }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchQueuedTrades()

    if (!userId) return

    const channel = supabase
      .channel('queued_trades_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queued_trades', filter: `user_id=eq.${userId}` },
        () => {
          fetchQueuedTrades()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchQueuedTrades])

  const queueOpenTrade = useCallback(
    async (side: 'long' | 'short', size: number, submittedPrice: number, playerPropId: string, marketTitle?: string, limitPrice?: number, tolerancePercent?: number) => {
      if (!userId) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single()

      if (!profile || profile.balance < size) {
        throw new Error('Insufficient balance')
      }

      await supabase
        .from('profiles')
        .update({ balance: profile.balance - size })
        .eq('id', userId)

      const { data, error } = await supabase
        .from('queued_trades')
        .insert({
          user_id: userId,
          player_prop_id: playerPropId,
          trade_type: 'open',
          side,
          size,
          submitted_price: submittedPrice,
          limit_price: limitPrice,
          tolerance_percent: tolerancePercent,
          market_title: marketTitle,
          status: 'pending',
        })
        .select()
        .single()

      if (error) {
        await supabase
          .from('profiles')
          .update({ balance: profile.balance })
          .eq('id', userId)
        throw error
      }

      await fetchQueuedTrades()
      return data
    },
    [userId, fetchQueuedTrades]
  )

  const queueCloseTrade = useCallback(
    async (positionId: string, submittedPrice: number, playerPropId: string, size: number, marketTitle?: string, limitPrice?: number) => {
      if (!userId) return null

      const { data, error } = await supabase
        .from('queued_trades')
        .insert({
          user_id: userId,
          player_prop_id: playerPropId,
          trade_type: 'close',
          size,
          submitted_price: submittedPrice,
          limit_price: limitPrice,
          position_id: positionId,
          market_title: marketTitle,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      await fetchQueuedTrades()
      return data
    },
    [userId, fetchQueuedTrades]
  )

  const cancelQueuedTrade = useCallback(
    async (tradeId: string) => {
      if (!userId) return

      const { data: trade } = await supabase
        .from('queued_trades')
        .select('*')
        .eq('id', tradeId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (!trade) throw new Error('Trade not found or already processed')

      if (trade.trade_type === 'open') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({ balance: profile.balance + Number(trade.size) })
            .eq('id', userId)
        }
      }

      const { error } = await supabase
        .from('queued_trades')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'user_cancelled',
        })
        .eq('id', tradeId)

      if (error) throw error

      await fetchQueuedTrades()
    },
    [userId, fetchQueuedTrades]
  )

  const getQueuedTradesForProp = useCallback(
    (propId: string) => {
      return queuedTrades.filter((t) => t.player_prop_id === propId)
    },
    [queuedTrades]
  )

  const getPendingCloseForPosition = useCallback(
    (positionId: string) => {
      return queuedTrades.find((t) => t.position_id === positionId && t.trade_type === 'close')
    },
    [queuedTrades]
  )

  return {
    queuedTrades,
    loading,
    queueOpenTrade,
    queueCloseTrade,
    cancelQueuedTrade,
    getQueuedTradesForProp,
    getPendingCloseForPosition,
    refetch: fetchQueuedTrades,
  }
}
