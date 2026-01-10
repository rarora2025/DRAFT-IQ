'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Loader2, Users, RefreshCw, LogOut, TrendingUp, Calendar, Clock, UserCheck, ArrowRightLeft, Info, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Image from 'next/image'

interface UserStat {
  id: string
  username: string
  email: string
  joinedAt: string
  lastLogon: string | null
  totalLogons: number
  totalTrades: number
}

interface SummaryStats {
  activePercent: number
  tradingPercent: number
  activeCount: number
  tradingCount: number
  totalUsers: number
}

const TIMEFRAMES = [
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'All Time', value: 'all' },
]

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [users, setUsers] = useState<UserStat[]>([])
  const [timeframe, setTimeframe] = useState('24h')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
  const isAdmin = user && adminIds.includes(user.id)

  const fetchData = useCallback(async (tf: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/analytics/summary?timeframe=${tf}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch analytics summary')
      const data = await response.json()
      setStats(data.stats)
      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

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

    fetchData(timeframe)
  }, [user, authLoading, isAdmin, router, timeframe, fetchData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData(timeframe)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020420] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3de100]" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#020420] flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-black mb-2">ACCESS DENIED</h1>
        <Button onClick={() => router.push('/')} variant="ghost">Return Home</Button>
      </div>
    )
  }

  const filteredUsers = users
    .filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.lastLogon || '').localeCompare(a.lastLogon || ''))

  return (
    <div className="min-h-screen bg-[#020420] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#040930]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black uppercase tracking-tighter">
              ANALYTICS <span className="text-[#3de100]">DASHBOARD</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    timeframe === tf.value 
                      ? 'bg-[#3de100] text-[#020420] shadow-lg shadow-[#3de100]/20' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#040930] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck className="w-12 h-12 text-[#3de100]" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Active Users</p>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-black font-mono">{stats?.activePercent.toFixed(1)}%</h2>
              <p className="text-xs text-zinc-500 mb-1">({stats?.activeCount} users)</p>
            </div>
          </div>

          <div className="bg-[#040930] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ArrowRightLeft className="w-12 h-12 text-[#3de100]" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Traders</p>
            <div className="flex items-end gap-2">
              <h2 className="text-4xl font-black font-mono">{stats?.tradingPercent.toFixed(1)}%</h2>
              <p className="text-xs text-zinc-500 mb-1">({stats?.tradingCount} users)</p>
            </div>
          </div>

          <div className="bg-[#040930] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-12 h-12 text-[#3de100]" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Users</p>
            <h2 className="text-4xl font-black font-mono">{stats?.totalUsers}</h2>
          </div>

          <div className="bg-gradient-to-br from-[#3de100]/10 to-transparent border border-[#3de100]/20 p-6 rounded-3xl relative overflow-hidden">
            <p className="text-[10px] font-black text-[#3de100] uppercase tracking-widest mb-1">Health Score</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#3de100]" />
              <h2 className="text-4xl font-black font-mono text-white">GOOD</h2>
            </div>
          </div>
        </div>

        {/* User Table */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">User Engagement</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Showing {filteredUsers.length} users</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search users or emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#040930] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#3de100]/50 transition-all"
              />
            </div>
          </div>
          
          <div className="bg-[#040930] border border-white/10 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">User</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Joined</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Sign-on</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Logons</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Trades</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Trades / Logon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredUsers.map((u) => {
                    const tradesPerLogon = u.totalLogons > 0 ? (u.totalTrades / u.totalLogons).toFixed(1) : '0.0'
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-sans">
                              {u.username}
                            </span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-[#3de100] transition-colors">
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 bg-[#040930] border-white/10 text-white p-4 rounded-2xl shadow-2xl">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Email Address</p>
                                    <p className="text-sm font-bold break-all">{u.email}</p>
                                  </div>
                                  <div className="pt-2 border-t border-white/5">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">User ID</p>
                                    <p className="text-[10px] font-mono text-zinc-400 break-all">{u.id}</p>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500">
                          {new Date(u.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {u.lastLogon ? (
                            <div className="flex items-center gap-2 text-xs text-[#3de100]">
                              <Clock className="w-3 h-3" />
                              {new Date(u.lastLogon).toLocaleString()}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-700 italic">Never</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-white">{u.totalLogons}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-white">{u.totalTrades}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-black text-[#3de100] bg-[#3de100]/10 px-2 py-0.5 rounded">
                            {tradesPerLogon}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">No users found.</td>
                    </tr>
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
