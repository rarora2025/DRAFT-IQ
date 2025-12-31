'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Position, User } from '@/lib/types'

export function useVault(userId: string | undefined) {
  const [data, setData] = useState<{
    profile: User | null;
    positions: Position[];
    total_portfolio_value: number;
    balance: number;
    positions_value: number;
    unrealized_pnl: number;
    queued_value: number;
  }>({
    profile: null,
    positions: [],
    total_portfolio_value: 0,
    balance: 0,
    positions_value: 0,
    unrealized_pnl: 0,
    queued_value: 0,
  })

  const [loading, setLoading] = useState(true)

    const fetchVault = useCallback(async () => {
      if (!userId) return

      const [profileRes, positionsRes, queuedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('positions').select('*').eq('user_id', userId).is('closed_at', null).order('created_at', { ascending: false }),
        supabase.from('queued_trades').select('size, trade_type').eq('user_id', userId).eq('status', 'pending'),
      ])

      if (profileRes.error || !profileRes.data) return

      const balance = Number(profileRes.data.balance)
      const profile: User = {
        ...profileRes.data,
        balance,
        daily_start_value: profileRes.data.daily_start_value ? Number(profileRes.data.daily_start_value) : undefined,
      } as User

      const queued_value = (queuedRes.data || [])
        .filter((q: any) => q.trade_type === 'open')
        .reduce((sum: number, q: any) => sum + Number(q.size), 0)

        let positions: Position[] = []
        if (positionsRes.data) {
          positions = positionsRes.data.map((p: any) => ({
            ...p,
            size: Number(p.size),
            quantity: Number(p.quantity || 0),
            entry_price: Number(p.entry_price),
            exit_price: p.exit_price ? Number(p.exit_price) : null,
            realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
            market_id: p.market_ticker || p.player_prop_id
          }))
        }

        const propIds = positions.map(p => p.market_id).filter(Boolean) as string[]
        let liveProps: any[] = []
        
          if (propIds.length > 0) {
            const { data: propsData } = await supabase
              .from('player_props')
              .select('id, current_value, line, status')
              .in('id', propIds)
            
            if (propsData) {
              liveProps = propsData
            }
          }
          
          let totalCostBasis = 0
          const enrichedPositions = positions.map(pos => {
            totalCostBasis += pos.size
            const liveProp = liveProps.find(p => p.id === pos.market_id)
            
            const underlyingPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
            
            let currentMarketPrice = underlyingPrice
            if (pos.side === 'short') {
              currentMarketPrice = (2 * pos.entry_price) - underlyingPrice
            }
            
            const market_value = Math.max(0, pos.quantity * currentMarketPrice)
            
            return {
              ...pos,
              current_price: underlyingPrice,
              market_value: market_value,
              market_status: liveProp?.status || 'LIVE'
            }
          })

        const positions_value = enrichedPositions.reduce((total, pos) => total + pos.market_value, 0)
        const total_portfolio_value = balance + positions_value + queued_value
        const unrealized_pnl = positions_value - totalCostBasis

        setData({
          profile,
          positions: enrichedPositions as any,
          total_portfolio_value,
          balance,
          positions_value: positions_value + queued_value,
          unrealized_pnl,
          queued_value,
        })
      setLoading(false)
    }, [userId])

  useEffect(() => {
    fetchVault()

    if (!userId) return

    const profileChannel = supabase
      .channel('vault_profile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, fetchVault)
      .subscribe()

    const positionsChannel = supabase
      .channel('vault_positions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions', filter: `user_id=eq.${userId}` }, fetchVault)
      .subscribe()

    const queuedChannel = supabase
      .channel('vault_queued')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queued_trades', filter: `user_id=eq.${userId}` }, fetchVault)
      .subscribe()

    const propsChannel = supabase
      .channel('vault_props')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'player_props' }, fetchVault)
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(positionsChannel)
      supabase.removeChannel(queuedChannel)
      supabase.removeChannel(propsChannel)
    }
  }, [userId, fetchVault])

  return { ...data, loading, refetch: fetchVault }
}
