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
  }>({
    profile: null,
    positions: [],
    totalValue: 0,
    balance: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchVault = useCallback(async () => {
    if (!userId) return

    const [profileRes, positionsRes, propsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('positions').select('*').eq('user_id', userId).is('closed_at', null).order('created_at', { ascending: false }),
      fetch('/api/games').then(res => res.json()).then(async (data) => {
        const games = data.games || []
        const allProps = await Promise.all(
          games.map((g: any) => fetch(`/api/games/${g.id}/props`).then(res => res.json()))
        )
        return allProps.flatMap(res => res.props || [])
      }).catch(() => [])
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

    const portfolioValue = positions.reduce((total, pos) => {
      const liveProp = propsRes.find((p: any) => p.id === pos.market_id)
      const currentPrice = liveProp?.current_value || liveProp?.line || pos.entry_price
      
      let percentChange = (currentPrice - pos.entry_price) / pos.entry_price
      if (pos.side === 'short') {
        percentChange = (pos.entry_price - currentPrice) / pos.entry_price
      }
      
      return total + (pos.size * (1 + percentChange))
    }, 0)

    const totalValue = balance + portfolioValue

    setData({
      profile,
      positions,
      totalValue,
      balance,
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
