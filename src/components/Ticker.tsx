'use client'

import { useEffect, useState } from 'react'
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

  if (loading || players.length === 0) return null

  // Duplicate players for seamless scroll (triple for safety)
  const displayPlayers = [...players, ...players, ...players]
  const duration = Math.max(players.length * 6, 40)

  return (
    <div 
      className="w-full bg-background/80 backdrop-blur-md border-b border-white/5 h-10 flex items-center overflow-hidden whitespace-nowrap z-[40] fixed top-16 left-0 right-0 cursor-pointer group"
    >
      <div
        className="flex items-center animate-[ticker_linear_infinite] group-hover:[animation-play-state:paused]"
        style={{ 
          animationDuration: `${duration}s`,
        }}
      >
        {displayPlayers.map((player, idx) => (
          <Link 
            key={`${player.id}-${idx}`} 
            href={`/markets/${player.game_id}/${player.player_id}`}
            className="flex items-center gap-6 group/item pr-16"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full overflow-hidden border border-primary/20 bg-card flex-shrink-0 group-hover/item:border-primary/50 transition-colors">
                <img 
                  src={player.pfp} 
                  alt={player.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=040930&color=3de100`;
                  }}
                />
              </div>
              <span className="text-[13px] font-bold text-white uppercase tracking-tight group-hover/item:text-primary transition-colors">{player.name}</span>
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
