'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile({
        ...data,
        balance: Number(data.balance),
        daily_start_value: data.daily_start_value ? Number(data.daily_start_value) : undefined,
      })
    }
    setLoading(false)
  }, [userId])

    useEffect(() => {
      fetchProfile()

      if (!userId) return

      const channel = supabase
        .channel(`profile_${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          () => {
            fetchProfile()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }, [userId, fetchProfile])

  const updateBalance = useCallback(async (newBalance: number) => {
    if (!userId) return

    await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId)

    setProfile((prev) => prev ? { ...prev, balance: newBalance } : null)
  }, [userId])

  const updateDailyStartValue = useCallback(async (value: number) => {
    if (!userId) return

    await supabase
      .from('profiles')
      .update({ 
        daily_start_value: value, 
        last_reset_at: new Date().toISOString() 
      })
      .eq('id', userId)

    setProfile((prev) => prev ? { 
      ...prev, 
      daily_start_value: value,
      last_reset_at: new Date().toISOString()
    } : null)
  }, [userId])

  return { profile, loading, refetch: fetchProfile, updateBalance, updateDailyStartValue }
}
