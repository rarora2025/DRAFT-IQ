'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Position, User } from '@/lib/types'

export function useVault(userId: string | undefined) {
  const [data, setData] = useState<{
    profile: User | null;
    positions: Position[];
  }>({
    profile: null,
    positions: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchVault = useCallback(async () => {
    if (!userId) return

    const [profileRes, positionsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('positions').select('*').eq('user_id', userId).is('closed_at', null).order('created_at', { ascending: false })
    ])

    const nextData: any = {}

    if (profileRes.data) {
      nextData.profile = {
        ...profileRes.data,
        balance: Number(profileRes.data.balance),
        daily_start_value: profileRes.data.daily_start_value ? Number(profileRes.data.daily_start_value) : undefined,
      }
    }

    if (positionsRes.data) {
      nextData.positions = positionsRes.data.map((p: any) => ({
        ...p,
        size: Number(p.size),
        entry_price: Number(p.entry_price),
        exit_price: p.exit_price ? Number(p.exit_price) : null,
        realized_pnl: p.realized_pnl ? Number(p.realized_pnl) : null,
        market_id: p.market_ticker || p.player_prop_id
      }))
    }

    setData(nextData)
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
