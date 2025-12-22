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
      
      // Expire check (20 minutes)
      const now = new Date().getTime()
      const props = (data.props || []).map((p: any) => {
        const lastUpdate = p.last_update ? new Date(p.last_update).getTime() : 0
        const isExpired = lastUpdate > 0 && (now - lastUpdate > 20 * 60 * 1000)
        return {
          ...p,
          current_value: p.line,
          status: isExpired ? 'expired' : (p.status || 'active')
        }
      })
      
      const nextProp = playerId 
        ? props.find((p: any) => p.id === playerId) || props[0]
        : props[0]

      if (nextProp) {
        if (lastLineRef.current !== nextProp.line) {
          lastLineRef.current = nextProp.line
          const hist = await fetchHistory(nextProp.id)
          const historyData = hist.length > 0 ? hist : [{ time: new Date().toISOString(), value: nextProp.line }]
          
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
