'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface TickerPlayer {
  id: string
  player_id: string
  game_id: string
  name: string
  pfp: string
  price: number
  change: number
}

// Global cache to persist across navigation/remounts
let tickerCache: TickerPlayer[] = []

export function Ticker() {
    // Initial state must match server to avoid hydration mismatch
    const [players, setPlayers] = useState<TickerPlayer[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      let isMounted = true

      // On client mount, check memory cache first for instant update
      if (tickerCache.length > 0) {
        setPlayers(tickerCache)
        setLoading(false)
      } else {
        // Fallback to localStorage if memory cache is empty (e.g. after full refresh)
        const saved = localStorage.getItem('draft_iq_ticker_data')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              tickerCache = parsed
              setPlayers(parsed)
              setLoading(false)
            }
          } catch (e) {
            console.error('Error parsing cached ticker data:', e)
          }
        }
      }

      const fetchTickerData = async (isInitial = false) => {
        try {
          const response = await fetch('/api/ticker')
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
          const data = await response.json()
          if (isMounted && data.players) {
            setPlayers(data.players)
            tickerCache = data.players // Update memory cache
            localStorage.setItem('draft_iq_ticker_data', JSON.stringify(data.players)) // Update persistent cache
          }
        } catch (error) {
          console.error('Error fetching ticker data:', error)
        } finally {
          if (isMounted && isInitial) setLoading(false)
        }
      }

      // If we don't have any data yet, this is the true initial fetch
      fetchTickerData(tickerCache.length === 0)
      const interval = setInterval(() => fetchTickerData(false), 30000)
      return () => {
        isMounted = false
        clearInterval(interval)
      }
    }, [])

    const displayPlayers = useMemo(() => {
      if (players.length === 0) return []
      // Triplicate players to ensure no gap during loop
      return [...players, ...players, ...players]
    }, [players])

    if (players.length === 0 && !loading) return null

    return (
      <div className="w-full bg-[#020420]/80 backdrop-blur-md h-10 flex items-center overflow-hidden whitespace-nowrap z-[401] fixed top-0 left-0 right-0 border-b border-white/5">
        <div className="flex items-center w-full">
          {players.length === 0 && loading ? (
            <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic px-8">
              Initializing market ticker...
            </div>
          ) : (
            <motion.div 
              className="flex items-center"
              animate={{
                x: ["0%", "-33.3333%"]
              }}
              transition={{
                duration: Math.max(players.length * 4, 20),
                ease: "linear",
                repeat: Infinity
              }}
            >
              {displayPlayers.map((player, idx) => (
                <div 
                  key={`${player.player_id}-${idx}`} 
                  className="flex items-center gap-4 px-8 shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-card flex-shrink-0">
                      <img 
                        src={player.pfp} 
                        alt={player.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=040930&color=3de100`;
                        }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-white uppercase tracking-tight whitespace-nowrap">{player.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-black text-primary tracking-tighter">
                      {(player.price || 0).toFixed(1)}
                    </span>
                    <span className={`text-[10px] font-black ${(player.change || 0) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                      {(player.change || 0) >= 0 ? '▲' : '▼'}{Math.abs(player.change || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    )
  }

