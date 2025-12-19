'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchLiveGames, fetchPlayerProps } from '@/lib/sportsData'

interface PropData {
  id: string
  playerName: string
  propType: string
  line: number
  currentPrice: number // 0-100 probability
  history: { time: string; price: number }[]
  gameId: string
  team: string
  opponent: string
}

export function useNBAProps() {
  const [games, setGames] = useState<any[]>([])
  const [props, setProps] = useState<PropData[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  const fetchInitialData = useCallback(async () => {
    try {
      const liveGames = await fetchLiveGames()
      setGames(liveGames)
      
      if (liveGames.length > 0) {
        const firstGameId = liveGames[0].id
        setSelectedGameId(firstGameId)
        
        const gameProps = await fetchPlayerProps(firstGameId)
        const initialProps: PropData[] = gameProps.map(p => {
          const now = new Date()
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const initialPrice = 50 + (Math.random() - 0.5) * 10 // Start near 50/50
          
          return {
            id: p.id,
            playerName: p.player_name,
            propType: p.prop_type,
            line: p.line,
            currentPrice: initialPrice,
            history: [{ time: timeStr, price: initialPrice }],
            gameId: p.game_id,
            team: '', // Add team if available in library
            opponent: ''
          }
        })
        
        setProps(initialProps)
        if (initialProps.length > 0) {
          setSelectedPropId(initialProps[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching NBA data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Simulation loop for price movements
  useEffect(() => {
    simulationRef.current = setInterval(() => {
      setProps(prevProps => {
        return prevProps.map(prop => {
          const volatility = 0.5
          const change = (Math.random() - 0.5) * volatility
          const newPrice = Math.max(1, Math.min(99, prop.currentPrice + change))
          
          const now = new Date()
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          
          return {
            ...prop,
            currentPrice: newPrice,
            history: [...prop.history.slice(-29), { time: timeStr, price: newPrice }]
          }
        })
      })
    }, 3000)

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [])

  const changeGame = useCallback(async (gameId: string) => {
    setLoading(true)
    setSelectedGameId(gameId)
    try {
      const gameProps = await fetchPlayerProps(gameId)
      const mappedProps: PropData[] = gameProps.map(p => {
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        const initialPrice = 50 + (Math.random() - 0.5) * 10
        return {
          id: p.id,
          playerName: p.player_name,
          propType: p.prop_type,
          line: p.line,
          currentPrice: initialPrice,
          history: [{ time: timeStr, price: initialPrice }],
          gameId: p.game_id,
          team: '',
          opponent: ''
        }
      })
      setProps(mappedProps)
      if (mappedProps.length > 0) {
        setSelectedPropId(mappedProps[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const selectedProp = props.find(p => p.id === selectedPropId) || props[0]
  const selectedGame = games.find(g => g.id === selectedGameId) || games[0]

  return {
    games,
    props,
    selectedGame,
    selectedProp,
    loading,
    changeGame,
    setSelectedPropId,
  }
}
