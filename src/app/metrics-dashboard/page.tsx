'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Loader2, Download, Table as TableIcon } from 'lucide-react'

interface AnalyticsEvent {
  id: string
  event_name: string
  user_id: string | null
  market_id: string | null
  properties: any
  created_at: string
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID

    useEffect(() => {
      if (authLoading) return
  
      if (!user || user.id !== adminId) {
        router.push('/login')
        return
      }
  
        const fetchEvents = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch('/api/v1-metrics/events', {
              headers: {
                'Authorization': `Bearer ${session?.access_token}`
              }
            })
            if (!response.ok) {
              throw new Error('Failed to fetch events')
            }
            const data = await response.json()
            setEvents(data.events)
          } catch (err: any) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        }
    
        fetchEvents()
      }, [user, authLoading, adminId, router])
    
      const handleDownloadCSV = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const response = await fetch('/api/v1-metrics/events?format=csv', {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          })
          
          if (!response.ok) throw new Error('Download failed')
          
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `metrics_events_${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        } catch (err: any) {
          setError(`Download failed: ${err.message}`)
        }
      }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (user?.id !== adminId) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TableIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">Admin Analytics</h1>
          </div>
          
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            <Download className="w-5 h-5" />
            Download CSV
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Timestamp</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Event</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">User ID</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Market ID</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Properties</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                          {event.event_name}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-muted-foreground">
                        {event.user_id || 'anonymous'}
                      </td>
                      <td className="p-4 font-mono text-[10px] text-muted-foreground">
                        {event.market_id || '-'}
                      </td>
                      <td className="p-4">
                        <pre className="text-[10px] font-mono text-muted-foreground max-w-xs overflow-hidden text-ellipsis bg-black/50 p-2 rounded">
                          {JSON.stringify(event.properties, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
