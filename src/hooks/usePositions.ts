'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Position } from '@/lib/types'

const LEVERAGE = 0.2

export function usePositions(userId: string | undefined) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPositions = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .is('closed_at', null)
      .order('created_at', { ascending: false })

    if (data) {
      setPositions(
        data.map((p) => ({
          ...p,
          size: Number(p.size),
          entry_price: Number(p.entry_price),
          exit_price: p.exit_price ? Number(p.exit_price) : null,
          realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
          market_id: p.market_ticker || p.player_prop_id // Fallback/Mapping
        }))
      )
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchPositions()

    if (!userId) return

    const channel = supabase
      .channel('positions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'positions', filter: `user_id=eq.${userId}` },
        () => {
          fetchPositions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchPositions])

  const openPosition = useCallback(
    async (side: 'long' | 'short', size: number, entryPrice: number, marketId?: string, marketTitle?: string) => {
      if (!userId) return null

      const { data, error } = await supabase
        .from('positions')
        .insert({
          user_id: userId,
          side,
          size,
          entry_price: entryPrice,
          market_ticker: marketId,
          market_title: marketTitle
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('trades').insert({
        user_id: userId,
        position_id: data.id,
        action: side === 'long' ? 'buy' : 'sell',
        size,
        price: entryPrice,
        market_title: marketTitle
      })

      await fetchPositions()
      return data
    },
    [userId, fetchPositions]
  )

  const closePosition = useCallback(
    async (positionId: string, exitPrice: number) => {
      if (!userId) return

      const position = positions.find((p) => p.id === positionId)
      if (!position) return

      const priceDiff = exitPrice - position.entry_price
      const percentChange = priceDiff / position.entry_price
      const pnl =
        position.side === 'long'
          ? position.size * LEVERAGE * percentChange
          : -position.size * LEVERAGE * percentChange

      await supabase
        .from('positions')
        .update({
          closed_at: new Date().toISOString(),
          exit_price: exitPrice,
          realized_pnl: pnl,
        })
        .eq('id', positionId)

      await supabase.from('trades').insert({
        user_id: userId,
        position_id: positionId,
        action: 'close',
        size: position.size,
        price: exitPrice,
        market_title: position.market_title
      })

      await fetchPositions()
      return pnl
    },
    [userId, positions, fetchPositions]
  )

  return { positions, loading, openPosition, closePosition, refetch: fetchPositions }
}
