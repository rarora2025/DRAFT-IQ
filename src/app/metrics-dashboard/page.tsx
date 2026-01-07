'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Loader2, Download, Table as TableIcon, AlertCircle, BarChart3, Users, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

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
  const [isRefreshing, setIsRefreshing] = useState(false)

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  const fetchEvents = async () => {
    setIsRefreshing(true)
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
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!isAdmin) {
      setLoading(false)
      return
    }

    fetchEvents()
  }, [user, authLoading, isAdmin, router])

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
      a.download = `draftiq_metrics_${new Date().toISOString().split('T')[0]}.csv`
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
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#EAB308]" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-white p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-zinc-400 text-center max-w-md mb-6">
          You do not have permission to view the metrics dashboard. 
          Your User ID: <span className="font-mono text-white text-xs">{user?.id}</span>
        </p>
        <button 
          onClick={() => router.push('/')}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors"
        >
          Return Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="DraftIQ" fill className="object-contain" />
            </div>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-display font-black uppercase tracking-tighter text-white">
              Metrics <span className="text-[#EAB308]">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              disabled={isRefreshing}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadCSV}
              className="bg-[#EAB308] hover:bg-[#D4A017] text-black font-bold gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="text-zinc-400 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#EAB308]/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-[#EAB308]" />
              </div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Total Events</h3>
            </div>
            <p className="text-4xl font-display font-black">{events.length.toLocaleString()}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#10B981]/10 rounded-lg">
                <TableIcon className="w-5 h-5 text-[#10B981]" />
              </div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Trades Tracked</h3>
            </div>
            <p className="text-4xl font-display font-black">
              {events.filter(e => e.event_name.includes('trade')).length.toLocaleString()}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">User Logons</h3>
            </div>
            <p className="text-4xl font-display font-black">
              {events.filter(e => e.event_name === 'user_logon').length.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h2 className="text-lg font-bold">Activity Feed</h2>
            <span className="text-xs text-zinc-500 font-medium">Last 1,000 events</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Event</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-500 italic">
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-300">
                        {new Date(event.created_at).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          event.event_name === 'user_logon' 
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : event.event_name === 'trade_opened'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20'
                        }`}>
                          {event.event_name.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">
                            {event.properties?.email || 'Anonymous'}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">
                            {event.user_id?.substring(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="bg-black/40 rounded-xl p-3 max-w-md overflow-hidden">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {Object.entries(event.properties || {}).map(([key, value]) => (
                              key !== 'email' && (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[9px] uppercase font-black text-zinc-600 tracking-tighter">{key}</span>
                                  <span className="text-xs font-mono text-zinc-300 truncate">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        :root {
          --font-display: 'Inter', sans-serif;
        }

        .font-display {
          font-family: var(--font-display);
        }
      `}</style>
    </div>
  )
}
