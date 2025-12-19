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
      const currentSelectedId = prev.selectedProp?.id || filteredProps[0]?.id
      const nextSelectedProp = filteredProps.find((p: any) => p.id === currentSelectedId) || filteredProps[0]
      
      return {
        ...prev,
        props: filteredProps,
        selectedProp: nextSelectedProp,
        loading: false
      }
    })

    // Fetch history for the currently selected prop
    const currentPropId = state.selectedProp?.id || filteredProps[0]?.id
    if (currentPropId) {
      const hist = await fetchHistory(currentPropId)
      if (hist.length > 0) {
        setState(prev => ({ ...prev, history: hist }))
      }
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
      // Increase frequency to see "API adjustments"
      const interval = setInterval(() => fetchProps(targetGameId), 10000)
      return () => clearInterval(interval)
    }
  }, [gameId, state.selectedGame?.id, fetchProps])

  const selectGame = (gId: string) => {
    const game = state.games.find(g => g.id === gId)
    if (game) setState(prev => ({ ...prev, selectedGame: game, loading: true, history: [] }))
  }

  const selectProp = async (propId: string) => {
    const prop = state.props.find(p => p.id === propId)
    if (prop) {
      const hist = await fetchHistory(propId)
      setState(prev => {
        const currentVal = prop.current_value || prop.line
        return { 
          ...prev, 
          selectedProp: { ...prop, current_value: currentVal }, 
          history: hist.length > 0 ? hist : [{ 
            time: new Date().toISOString(), 
            value: currentVal
          }] 
        }
      })
    }
  }

  return {
    ...state,
    selectGame,
    selectProp
  }
}
