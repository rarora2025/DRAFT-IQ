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
}

export interface NBAGame {
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
  games: NBAGame[]
  selectedGame: NBAGame | null
  props: NBAProp[]
  selectedProp: NBAProp | null
  history: { time: string; value: number }[]
  loading: boolean
}

export function useNBAData() {
  const [state, setState] = useState<NBAState>({
    games: [],
    selectedGame: null,
    props: [],
    selectedProp: null,
    history: [],
    loading: true
  })
  
  const simulationRef = useRef<NodeJS.Timeout | null>(null)

  const fetchGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      const games = data.games || []
      
      setState(prev => {
        const nextSelectedGame = prev.selectedGame 
          ? games.find((g: any) => g.id === prev.selectedGame?.id) || games[0]
          : games[0]
          
        return {
          ...prev,
          games,
          selectedGame: nextSelectedGame,
          loading: prev.props.length > 0 ? false : prev.loading
        }
      })
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }, [])

  const fetchProps = useCallback(async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/props`)
      const data = await response.json()
      const props = data.props || []
      
      setState(prev => {
        const nextSelectedProp = prev.selectedProp
          ? props.find((p: any) => p.id === prev.selectedProp?.id) || props[0]
          : props[0]
          
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        
        return {
          ...prev,
          props,
          selectedProp: nextSelectedProp,
          loading: false,
          history: prev.history.length > 0 ? prev.history : [{ time: timeStr, value: nextSelectedProp?.line || 0 }]
        }
      })
    } catch (error) {
      console.error('Error fetching props:', error)
    }
  }, [])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 30000)
    return () => clearInterval(interval)
  }, [fetchGames])

  useEffect(() => {
    if (state.selectedGame) {
      fetchProps(state.selectedGame.id)
    }
  }, [state.selectedGame?.id, fetchProps])

  useEffect(() => {
    simulationRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.selectedProp) return prev
        
        const noise = (Math.random() - 0.5) * 0.1
        const newValue = Math.round((prev.selectedProp.current_value + noise) * 100) / 100
        
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        
        return {
          ...prev,
          selectedProp: { ...prev.selectedProp, current_value: newValue },
          history: [...prev.history.slice(-29), { time: timeStr, value: newValue }]
        }
      })
    }, 5000)
    
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [state.selectedProp?.id])

  const selectGame = (gameId: string) => {
    const game = state.games.find(g => g.id === gameId)
    if (game) setState(prev => ({ ...prev, selectedGame: game, loading: true, history: [] }))
  }

  const selectProp = (propId: string) => {
    const prop = state.props.find(p => p.id === propId)
    if (prop) {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      setState(prev => ({ 
        ...prev, 
        selectedProp: prop, 
        history: [{ time: timeStr, value: prop.current_value || prop.line }] 
      }))
    }
  }

  return {
    ...state,
    selectGame,
    selectProp
  }
}
