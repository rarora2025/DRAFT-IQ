'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ProjectionData {
  temperature: number
  history: { time: string; temp: number }[]
  change: number
  openingTemp: number
}

export function useProjection() {
  const [data, setData] = useState<ProjectionData>({
    temperature: 36,
    history: [],
    change: 0,
    openingTemp: 36,
  })
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  const fetchLatest = useCallback(async () => {
    const { data: projections } = await supabase
      .from('projections')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (projections && projections.length > 0) {
      const latest = projections[0]
      const oldest = projections[projections.length - 1]
      const history = projections
        .slice()
        .reverse()
        .map((p) => ({
          time: new Date(p.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          temp: Number(p.temperature),
        }))

      setData({
        temperature: Number(latest.temperature),
        history,
        change: Number(latest.temperature) - Number(oldest.temperature),
        openingTemp: Number(oldest.temperature),
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLatest()

    const channel = supabase
      .channel('projections_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projections' },
        (payload) => {
          const newTemp = Number(payload.new.temperature)
          setData((prev) => {
            const newHistory = [
              ...prev.history,
              {
                time: new Date(payload.new.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                temp: newTemp,
              },
            ].slice(-30)

            return {
              ...prev,
              temperature: newTemp,
              history: newHistory,
              change: newTemp - prev.openingTemp,
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLatest])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const interval = setInterval(() => {
      setData((prev) => {
        const delta = (Math.random() - 0.5) * 0.8
        const newTemp = Math.max(20, Math.min(60, prev.temperature + delta))
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })

        const newHistory = [
          ...prev.history,
          { time: timeStr, temp: newTemp },
        ].slice(-30)

        return {
          ...prev,
          temperature: newTemp,
          history: newHistory,
          change: newTemp - prev.openingTemp,
        }
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return { ...data, loading, refetch: fetchLatest }
}
