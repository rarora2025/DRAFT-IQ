'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Position, User } from '@/lib/types'

export function useVault(userId: string | undefined) {
  const [data, setData] = useState<{
    profile: User | null;
    positions: Position[];
    totalValue: number;
    balance: number;
    positionsValue: number;
    unrealizedPnl: number;
  }>({
    profile: null,
    positions: [],
    totalValue: 0,
    balance: 0,
    positionsValue: 0,
    unrealizedPnl: 0,
  })
  const [loading, setLoading] = useState(true)

    const fetchVault = useCallback(async () => {
      if (!userId) return

      // Fetch profile and positions
      const [profileRes, positionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('positions').select('*').eq('user_id', userId).is('closed_at', null).order('created_at', { ascending: false }),
      ])

      let balance = 0
      let profile: User | null = null
      let positions: Position[] = []

      if (profileRes.data) {
        balance = Number(profileRes.data.balance)
        profile = {
          ...profileRes.data,
          balance,
          daily_start_value: profileRes.data.daily_start_value ? Number(profileRes.data.daily_start_value) : undefined,
        } as User
      }

      if (positionsRes.data) {
        positions = positionsRes.data.map((p: any) => ({
          ...p,
          size: Number(p.size),
          entry_price: Number(p.entry_price),
          exit_price: p.exit_price ? Number(p.exit_price) : null,
          realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
          market_id: p.market_ticker || p.player_prop_id
        }))
      }

      // Fetch live prices for all active positions directly from DB for maximum consistency
      const propIds = positions.map(p => p.market_id).filter(Boolean) as string[]
      let liveProps: any[] = []
      
      if (propIds.length > 0) {
        const { data: propsData } = await supabase
          .from('player_props')
          .select('id, current_value, line')
          .in('id', propIds)
        
        if (propsData) {
          liveProps = propsData
        }
      }

      // Calculate portfolio value using the 3-value model invariants
      let totalCostBasis = 0
      const enrichedPositions = positions.map(pos => {
        totalCostBasis += pos.size
        const liveProp = liveProps.find(p => p.id === pos.market_id)
        const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
        
        let multiplier = currentPrice / pos.entry_price
        if (pos.side === 'short') {
          multiplier = 2 - (currentPrice / pos.entry_price)
        }
        
        return {
          ...pos,
          current_price: currentPrice,
          market_value: pos.size * multiplier
        }
      })

      const positionsValue = enrichedPositions.reduce((total, pos) => total + pos.market_value, 0)
      const totalValue = balance + positionsValue
      const unrealizedPnl = positionsValue - totalCostBasis

      setData({
        profile,
        positions: enrichedPositions as any,
        totalValue,
        balance,
        positionsValue,
        unrealizedPnl,
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

    return () => {
      supabase.removeChannel(profileChannel)
      supabase.removeChannel(positionsChannel)
    }
  }, [userId, fetchVault])

  return { ...data, loading, refetch: fetchVault }
}
