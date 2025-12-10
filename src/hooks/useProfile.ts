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
      })
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateBalance = useCallback(async (newBalance: number) => {
    if (!userId) return

    await supabase
      .from('profiles')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', userId)

    setProfile((prev) => prev ? { ...prev, balance: newBalance } : null)
  }, [userId])

  return { profile, loading, refetch: fetchProfile, updateBalance }
}
