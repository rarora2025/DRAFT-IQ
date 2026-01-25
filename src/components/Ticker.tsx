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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        if (data.players) setPlayers(data.players)
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

  if (players.length === 0 && !loading) return null

  // Duplicate players exactly once for seamless 50% scroll
  const displayPlayers = [...players, ...players]

  return (
    <div className="w-full bg-background/80 backdrop-blur-md h-10 flex items-center overflow-hidden whitespace-nowrap z-[101] fixed top-0 left-0 right-0 border-b border-white/5">
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          display: flex;
          animation: scroll ${Math.max(players.length * 5, 20)}s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="ticker-scroll items-center">
        {loading ? (
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic px-8">
            Fetching latest player prices...
          </div>
        ) : (
            displayPlayers.map((player, idx) => (
              <div 
                key={`${player.id}-${idx}`} 
                className="flex items-center gap-4 px-4 shrink-0 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-card flex-shrink-0">
                    <img 
                      src={player.pfp} 
                      alt={player.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=040930&color=3de100`;
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-white uppercase tracking-tight whitespace-nowrap">{player.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono font-black text-primary tracking-tighter">
                    ${(player.price || 0).toFixed(1)}
                  </span>
                  <span className={`text-[10px] font-black ${(player.change || 0) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                    {(player.change || 0) >= 0 ? '▲' : '▼'}{Math.abs(player.change || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
