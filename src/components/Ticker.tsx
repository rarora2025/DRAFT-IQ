'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TickerPlayer {
  id: string
  name: string
  pfp: string
  price: number
  change: number
}

export function Ticker() {
  const [players, setPlayers] = useState<TickerPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimationControls()

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await fetch('/api/ticker')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response was not JSON')
        }
        const data = await response.json()
        if (data.players) {
          setPlayers(data.players)
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTickerData()
    const interval = setInterval(fetchTickerData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading || players.length === 0) return null

  // Duplicate players to ensure seamless infinite scroll
  const displayPlayers = [...players, ...players, ...players]

  return (
    <div className="w-full bg-black/40 backdrop-blur-md border-b border-white/5 h-10 flex items-center overflow-hidden whitespace-nowrap z-[101] fixed top-0 left-0 right-0">
      <motion.div
        animate={{
          x: ["0%", "-33.33%"],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: players.length * 3,
            ease: "linear",
          },
        }}
        className="flex items-center gap-12 px-4"
      >
        {displayPlayers.map((player, idx) => (
          <div key={`${player.id}-${idx}`} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-zinc-900 flex-shrink-0">
              <img src={player.pfp} alt={player.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-white uppercase tracking-tight">{player.name}</span>
              <span className="text-[10px] font-mono font-medium text-zinc-400">${player.price.toFixed(1)}</span>
              <div className={`flex items-center gap-0.5 text-[10px] font-bold ${player.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {player.change >= 0 ? '+' : '-'}{Math.abs(player.change).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
