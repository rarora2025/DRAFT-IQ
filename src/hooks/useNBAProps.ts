'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface NBAProp {
  id: string
  game_id: string
  player_id: string
  player_name: string
  prop_type: string
  line: number
  over_odds: number
  under_odds: number
  current_value: number
  status: 'active' | 'settled' | 'cancelled'
  team: string
  opponent: string
}

export interface Game {
  id: string
  sport: 'NBA'
  home_team: string
  away_team: string
  game_time: string
  status: 'upcoming' | 'live' | 'completed'
  home_score: number
  away_score: number
}

interface NBAState {
  props: NBAProp[]
  selectedProp: NBAProp | null
  history: { time: string; value: number }[]
  loading: boolean
}

export function useNBAProps() {
  const [games, setGames] = useState<Game[]>([])
  const [props, setProps] = useState<NBAProp[]>([])
  const [selectedProp, setSelectedProp] = useState<NBAProp | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{ time: string; value: number }[] >([])
  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games?sport=NBA')
      const data = await response.json()
      const nbaGames = data.games || []
      setGames(nbaGames)
      
      if (nbaGames.length > 0 && !selectedProp) {
        // Fetch props for the first game initially
        fetchProps(nbaGames[0].id)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedProp])

  const fetchProps = useCallback(async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/props?sport=NBA`)
      const data = await response.json()
      const nbaProps = data.props || []
      setProps(nbaProps)
      
      if (nbaProps.length > 0 && !selectedProp) {
        const initialProp = nbaProps[0]
        setSelectedProp(initialProp)
        
        // Initialize history with line
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        setHistory([{ time: timeStr, value: initialProp.line }])
      }
    } catch (error) {
      console.error('Error fetching props:', error)
    }
  }, [selectedProp])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 30000)
    return () => clearInterval(interval)
  }, [fetchGames])

  // Simulation like weather data
  useEffect(() => {
    if (!selectedProp) return

    simulationRef.current = setInterval(() => {
      setHistory(prev => {
        const lastValue = prev.length > 0 ? prev[prev.length - 1].value : selectedProp.line
        const noise = (Math.random() - 0.5) * 0.5
        const newValue = Math.max(0, lastValue + noise)
        
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        
        return [...prev.slice(-29), { time: timeStr, value: newValue }]
      })
    }, 5000)

    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [selectedProp])

  const changeProp = (propId: string) => {
    const prop = props.find(p => p.id === propId)
    if (prop) {
      setSelectedProp(prop)
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setHistory([{ time: timeStr, value: prop.line }])
    }
  }

  return {
    games,
    props,
    selectedProp,
    currentValue: history.length > 0 ? history[history.length - 1].value : (selectedProp?.line ?? 0),
    history,
    loading,
    changeProp,
    fetchProps
  }
}
