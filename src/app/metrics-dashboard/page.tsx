'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Loader2, Download, Table as TableIcon, AlertCircle, Users, RefreshCw, LogOut, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react'
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

const PAGE_SIZE = 50

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [trades, setTrades] = useState<AnalyticsEvent[]>([])
  const [logons, setLogons] = useState<AnalyticsEvent[]>([])
  const [totalTrades, setTotalTrades] = useState(0)
  const [totalLogons, setTotalLogons] = useState(0)
  
  const [tradePage, setTradePage] = useState(0)
  const [logonPage, setLogonPage] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  const fetchTrades = useCallback(async (page: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/v1-metrics/events?type=trades&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch trades')
      const data = await response.json()
      setTrades(data.events)
      setTotalTrades(data.total || 0)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchLogons = useCallback(async (page: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      // We fetch more logons to ensure we can unique them properly in the frontend
      // or just fetch enough to show a good unique list.
      const response = await fetch(`/api/v1-metrics/events?type=logons&limit=1000&offset=0`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch logons')
      const data = await response.json()
      
      // Unique logons by user_id
      const uniqueLogons: AnalyticsEvent[] = []
      const seenUsers = new Set()
      
      for (const event of data.events) {
        if (event.user_id && !seenUsers.has(event.user_id)) {
          seenUsers.add(event.user_id)
          uniqueLogons.push(event)
        }
      }
      
      setLogons(uniqueLogons)
      setTotalLogons(data.total || 0)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const refreshAll = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchTrades(tradePage), fetchLogons(logonPage)])
    setIsRefreshing(false)
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

    const init = async () => {
      setLoading(true)
      await Promise.all([fetchTrades(0), fetchLogons(0)])
      setLoading(false)
    }
    init()
  }, [user, authLoading, isAdmin, router, fetchTrades, fetchLogons])

  useEffect(() => {
    if (isAdmin) fetchTrades(tradePage)
  }, [tradePage, isAdmin, fetchTrades])

  const handleDownloadCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/v1-metrics/events?format=csv', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
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
        <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
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
        </p>
        <button onClick={() => router.push('/')} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors">
          Return Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="DraftIQ" fill className="object-contain" />
            </div>
            <div className="h-6 w-px bg-white/10" />
            <h1 className="text-xl font-black uppercase tracking-tighter text-white">
              Metrics <span className="text-[#10B981]">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={isRefreshing} className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleDownloadCSV} className="bg-[#10B981] hover:bg-[#0D9488] text-white font-bold gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-zinc-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* User Sign Ons Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10B981]/10 rounded-lg">
                <Users className="w-5 h-5 text-[#10B981]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">User Sign Ons</h2>
            </div>
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{logons.length} Unique Users</span>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Active</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Properties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logons.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No logons found.</td></tr>
                  ) : (
                    logons.map((event) => (
                      <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-[#10B981]">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-white">{event.properties?.email || 'Anonymous'}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[10px] text-zinc-500">
                          {event.user_id}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-mono text-zinc-600 bg-black/40 px-2 py-1 rounded">
                            {Object.keys(event.properties || {}).length} attrs
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* User Trades Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#10B981]/10 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-[#10B981]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">User Trades</h2>
            </div>
            
            <div className="flex items-center gap-4">
               <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Page {tradePage + 1} of {Math.ceil(totalTrades / PAGE_SIZE)}</span>
               <div className="flex items-center gap-1">
                 <Button 
                   variant="outline" 
                   size="icon" 
                   className="w-8 h-8 rounded-lg bg-white/5 border-white/10"
                   disabled={tradePage === 0}
                   onClick={() => setTradePage(p => p - 1)}
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </Button>
                 <Button 
                   variant="outline" 
                   size="icon" 
                   className="w-8 h-8 rounded-lg bg-white/5 border-white/10"
                   disabled={(tradePage + 1) * PAGE_SIZE >= totalTrades}
                   onClick={() => setTradePage(p => p + 1)}
                 >
                   <ChevronRight className="w-4 h-4" />
                 </Button>
               </div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Timestamp</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Action</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Trade Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trades.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No trades found.</td></tr>
                  ) : (
                    trades.map((event) => (
                      <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-mono text-xs text-zinc-500 group-hover:text-zinc-300">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            event.event_name === 'trade_opened'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {event.event_name === 'trade_opened' ? 'Opened' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{event.properties?.email || 'Anonymous'}</span>
                            <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[120px]">{event.user_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {Object.entries(event.properties || {}).map(([key, value]) => (
                              !['email', 'userId'].includes(key) && (
                                <div key={key} className="flex flex-col">
                                  <span className="text-[9px] uppercase font-black text-zinc-600 tracking-tighter">{key}</span>
                                  <span className="text-xs font-mono text-zinc-300">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              )
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
