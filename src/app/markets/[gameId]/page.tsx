'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Activity, User, Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

interface PlayerProp {
  id: string
  player_name: string
  line: number
  prop_type: string
}

export default function GameDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params?.gameId as string
  const sport = searchParams.get('sport') || 'basketball_nba'

  const [props, setProps] = useState<PlayerProp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
    // Refresh every 30 seconds as requested
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [gameId, sport])

  async function fetchData() {
    try {
      const response = await fetch(`/api/games/${gameId}/props?sport=${sport}`)
      const data = await response.json()
      setProps(data.props || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return props
    const search = searchQuery.toLowerCase()
    return props.filter(p => p.player_name.toLowerCase().includes(search))
  }, [props, searchQuery])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <Link
          href="/markets"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 font-display">Player Props</h1>
          <p className="text-zinc-400">Trade on individual player performance</p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111116] border border-[#27272a] rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">Loading props...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredPlayers.map((player) => (
              <Link
                key={player.id}
                href={`/markets/${gameId}/${player.id}?sport=${sport}&name=${encodeURIComponent(player.player_name)}`}
                className="group"
              >
                <div className="bg-[#111116] border border-[#27272a] rounded-xl p-5 flex items-center justify-between hover:border-emerald-500/50 hover:bg-[#1c1c24] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <User className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {player.player_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                          {player.prop_type}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-sm font-bold text-emerald-500">
                          {player.line}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-all group-hover:translate-x-1" />
                </div>
              </Link>
            ))}

            {filteredPlayers.length === 0 && (
              <div className="text-center py-20 bg-[#111116] border border-[#27272a] border-dashed rounded-2xl">
                <Search className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">No props found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Navbar isDark={true} />
    </div>
  )
}
