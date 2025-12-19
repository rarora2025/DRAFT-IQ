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

export function useNBAData(gameId?: string, playerId?: string) {
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
        const nextSelectedGame = gameId 
          ? games.find((g: any) => g.id === gameId) || null
          : prev.selectedGame || games[0]
          
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
  }, [gameId])

  const fetchHistory = useCallback(async (propId: string) => {
    try {
      const response = await fetch(`/api/props/${propId}/history`)
      const data = await response.json()
      return data.history || []
    } catch (error) {
      console.error('Error fetching history:', error)
      return []
    }
  }, [])

  const fetchProps = useCallback(async (gId: string) => {
    try {
      const response = await fetch(`/api/games/${gId}/props`)
      const data = await response.json()
      let props = data.props || []
      
      // Filter by playerId if provided
      const filteredProps = playerId ? props.filter((p: any) => p.player_id === playerId) : props

      setState(prev => {
        const nextSelectedProp = prev.selectedProp
          ? filteredProps.find((p: any) => p.id === prev.selectedProp?.id) || filteredProps[0]
          : filteredProps[0]
          
        return {
          ...prev,
          props: filteredProps,
          selectedProp: nextSelectedProp,
          loading: false
        }
      })

      // Fetch history for the selected prop if it changes or if we don't have it
      if (filteredProps.length > 0) {
        const targetProp = filteredProps[0]
        const hist = await fetchHistory(targetProp.id)
        setState(prev => ({ ...prev, history: hist.length > 0 ? hist : prev.history }))
      }

    } catch (error) {
      console.error('Error fetching props:', error)
    }
  }, [playerId, fetchHistory])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 30000)
    return () => clearInterval(interval)
  }, [fetchGames])

  useEffect(() => {
    const targetGameId = gameId || state.selectedGame?.id
    if (targetGameId) {
      fetchProps(targetGameId)
    }
  }, [gameId, state.selectedGame?.id, fetchProps])

  useEffect(() => {
    simulationRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.selectedProp) return prev
        
        // Simulation now follows the "base value" (line) with noise
        // User said: "the api changing should be the biggest factor the liverandom component shouldnt affect it too much"
        const baseValue = prev.selectedProp.line
        const currentVal = prev.selectedProp.current_value
        
        // Slight drift towards baseValue if too far, plus noise
        const drift = (baseValue - currentVal) * 0.05
        const noise = (Math.random() - 0.5) * 0.2
        const newValue = Math.round((currentVal + drift + noise) * 100) / 100
        
        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        
        return {
          ...prev,
          selectedProp: { ...prev.selectedProp, current_value: newValue },
          history: [...prev.history.slice(-49), { time: timeStr, value: newValue }]
        }
      })
    }, 5000)
    
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current)
    }
  }, [state.selectedProp?.id])

  const selectGame = (gId: string) => {
    const game = state.games.find(g => g.id === gId)
    if (game) setState(prev => ({ ...prev, selectedGame: game, loading: true, history: [] }))
  }

  const selectProp = async (propId: string) => {
    const prop = state.props.find(p => p.id === propId)
    if (prop) {
      const hist = await fetchHistory(propId)
      setState(prev => ({ 
        ...prev, 
        selectedProp: prop, 
        history: hist.length > 0 ? hist : [{ 
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), 
          value: prop.current_value || prop.line 
        }] 
      }))
    }
  }

  return {
    ...state,
    selectGame,
    selectProp
  }
}
