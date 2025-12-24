'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

export interface NBAProp {
  id: string
  player_name: string
  team?: string
  sport?: string
  photo_url?: string
  prop_type: string
  line: number
  current_value: number
  status: 'PRE_GAME' | 'LIVE' | 'FROZEN' | 'SETTLED' | 'active'
  final_reference_value?: number | null
  last_update?: string
}

export interface NBAGame {
  id: string
  sport: 'NBA' | 'NFL'
  home_team: string
  away_team: string
  game_time: string
  status: 'upcoming' | 'live' | 'completed'
  home_score: string
  away_score: string
  sport_key: string
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
  const searchParams = useSearchParams()
  const sport = searchParams.get('sport') || 'basketball_nba'
  
  const [state, setState] = useState<NBAState>({
    games: [],
    selectedGame: null,
    props: [],
    selectedProp: null,
    history: [],
    loading: true
  })
  
  const lastLineRef = useRef<number | null>(null)

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
          selectedGame: nextSelectedGame
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
      const response = await fetch(`/api/games/${gId}/props?sport=${sport}`)
      const data = await response.json()
      
      const props = (data.props || []).map((p: any) => {
        return {
          ...p,
          current_value: p.line,
          status: p.status || 'active'
        }
      })
      
      const nextProp = playerId 
        ? props.find((p: any) => p.id === playerId) || props[0]
        : props[0]

        if (nextProp) {
          // Always fetch history on first load or every 30 seconds
          const shouldFetchHistory = lastLineRef.current !== nextProp.line || 
                                    !state.history.length || 
                                    (Date.now() % 30000 < 5000); // Fetch roughly every 30s
          
          if (shouldFetchHistory) {
            lastLineRef.current = nextProp.line
            const hist = await fetchHistory(nextProp.id)
            
            // Ensure there is always a current point
            const nowPoint = { time: new Date().toISOString(), value: nextProp.line }
            const historyData = hist.length > 0 ? [...hist, nowPoint] : [nowPoint]
            
            setState(prev => ({
              ...prev,
              props,
              selectedProp: nextProp,
              history: historyData,
              loading: false
            }))
          } else {
            setState(prev => ({
              ...prev,
              props,
              selectedProp: nextProp,
              loading: false
            }))
          }
        } else {
        setState(prev => ({ ...prev, props: [], selectedProp: null, loading: false }))
      }
    } catch (error) {
      console.error('Error fetching props:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [playerId, sport, fetchHistory])

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 15000) // 15s instead of 60s
    return () => clearInterval(interval)
  }, [fetchGames])

  useEffect(() => {
    const targetGameId = gameId || state.selectedGame?.id
    if (targetGameId) {
      fetchProps(targetGameId)
      const interval = setInterval(() => fetchProps(targetGameId), 5000) // 5s instead of 45s for active games
      return () => clearInterval(interval)
    }
  }, [gameId, state.selectedGame?.id, fetchProps])

  return {
    ...state,
    refresh: () => {
      fetchGames();
      const targetGameId = gameId || state.selectedGame?.id;
      if (targetGameId) fetchProps(targetGameId);
    }
  }
}
