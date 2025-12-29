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
  actual_value?: number
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
  const lastFetchTimeRef = useRef<number | null>(null)
  const historyLengthRef = useRef<number>(0)

  // Update ref when history changes
  useEffect(() => {
    historyLengthRef.current = state.history.length
  }, [state.history.length])

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
            current_value: p.current_value ?? p.line,
            status: p.status || 'LIVE'
          }
        })
      
      const nextProp = playerId 
        ? props.find((p: any) => p.id === playerId) || props[0]
        : props[0]

            if (nextProp) {
              // Fetch history if:
              // 1. First load
              // 2. Line changed
              // 3. No history yet
              // 4. It's been more than 5 seconds since last history fetch (for live games)
              const now = Date.now()
              const timeSinceLastFetch = lastFetchTimeRef.current ? now - lastFetchTimeRef.current : Infinity
              
                const shouldFetchHistory = lastLineRef.current !== nextProp.line || 
                                          !historyLengthRef.current || 
                                          timeSinceLastFetch > 5000 


            
              if (shouldFetchHistory) {
                lastLineRef.current = nextProp.line
                lastFetchTimeRef.current = now
                const hist = await fetchHistory(nextProp.id)
                
                // Use history from DB as the universal source of truth. 
                // We no longer manually add a "now" point to avoid non-aligned points.
                const historyData = hist.length > 0 ? hist : []
                
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
    const interval = setInterval(fetchGames, 15000)
    return () => clearInterval(interval)
  }, [fetchGames])

    useEffect(() => {
      const targetGameId = gameId || state.selectedGame?.id
      if (targetGameId) {
        const isLive = state.selectedGame?.status === 'live'
        fetchProps(targetGameId)
        // Poll every 5s if live, every 30s if upcoming
        const interval = setInterval(() => fetchProps(targetGameId), isLive ? 5000 : 30000) 
        return () => clearInterval(interval)
      }
    }, [gameId, state.selectedGame?.id, state.selectedGame?.status, fetchProps])


  return {
    ...state,
    refresh: () => {
      fetchGames();
      const targetGameId = gameId || state.selectedGame?.id;
      if (targetGameId) fetchProps(targetGameId);
    }
  }
}
