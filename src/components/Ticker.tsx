'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

import Link from 'next/link'

interface TickerPlayer {
  id: string
  player_id: string
  game_id: string
  name: string
  pfp: string
  price: number
  change: number
}

export function Ticker() {
  const [players, setPlayers] = useState<TickerPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimationControls()

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await fetch('/api/ticker')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
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
    const interval = setInterval(fetchTickerData, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (players.length > 0) {
      // We'll use CSS animations for a smoother, non-glitching experience
      // that supports pause on hover naturally.
    }
  }, [players])

  if (loading || players.length === 0) return null

  // Duplicate players for seamless scroll
  const displayPlayers = [...players, ...players, ...players, ...players]

  return (
    <div 
      className="w-full bg-background border-b border-white/5 h-10 flex items-center overflow-hidden whitespace-nowrap z-[101] fixed top-0 left-0 right-0"
    >
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          display: flex;
          animation: scroll ${Math.max(players.length * 3, 30)}s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-scroll items-center gap-16 px-4">
        {displayPlayers.map((player, idx) => (
          <Link 
            key={`${player.id}-${idx}`} 
            href={`/markets/${player.game_id}/${player.player_id}`}
            className="flex items-center gap-6 group px-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/20 bg-card flex-shrink-0 group-hover:border-primary/50 transition-colors">
                <img 
                  src={player.pfp} 
                  alt={player.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=040930&color=3de100`;
                  }}
                />
              </div>
              <span className="text-[13px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors whitespace-nowrap">{player.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-mono font-black text-primary tracking-tighter">
                ${(player.price || 0).toFixed(2)}
              </span>
              <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${(player.change || 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                {(player.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(player.change || 0).toFixed(1)}%
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
