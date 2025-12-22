'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Position } from '@/lib/types'

const LEVERAGE = 1.0

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
          .rpc('open_trading_position', {
            p_user_id: userId,
            p_side: side,
            p_size: size,
            p_entry_price: entryPrice,
            p_player_prop_id: marketId,
            p_market_title: marketTitle
          })

        if (error) {
          console.error('Error opening position:', error)
          throw error
        }

        await fetchPositions()
        return data
      },
      [userId, fetchPositions]
    )

    const closePosition = useCallback(
      async (positionId: string, exitPrice: number) => {
        if (!userId) return

        const { data, error } = await supabase
          .rpc('close_trading_position', {
            p_position_id: positionId,
            p_exit_price: exitPrice
          })

        if (error) {
          console.error('Error closing position:', error)
          throw error
        }

        await fetchPositions()
        return data.pnl
      },
      [userId, fetchPositions]
    )

  return { positions, loading, openPosition, closePosition, refetch: fetchPositions }
}
