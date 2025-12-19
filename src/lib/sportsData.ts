interface Game {
  id: string
  sport: 'NFL' | 'NBA'
  home_team: string
  away_team: string
  game_time: string
  status: 'upcoming' | 'live' | 'completed'
  home_score: number
  away_score: number
}

interface Player {
  id: string
  name: string
  team: string
  sport: 'NFL' | 'NBA' | 'MLB'
  position: string
}

interface PlayerProp {
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

const SPORTSDATA_API_KEY = 'd3f707b88cf14debb99a7330aca477a7'
const NBA_BASE_URL = 'https://api.sportsdata.io/v3/nba'

export async function fetchLiveGames(sport: 'NFL' | 'NBA'): Promise<Game[]> {
  if (sport === 'NBA') {
    return fetchNBAGames()
  }
  
  // Fallback to mock for other sports for now
  return getMockGames(sport)
}

async function fetchNBAGames(): Promise<Game[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    // For testing/consistency with user request date
    const date = '2025-12-19' 
    
    const response = await fetch(`${NBA_BASE_URL}/scores/json/GamesByDate/${date}?key=${SPORTSDATA_API_KEY}`, {
      next: { revalidate: 300 }
    })
    
    if (!response.ok) {
      throw new Error(`SportsData NBA Games API error: ${response.status}`)
    }

    const gamesData = await response.json()
    
    return gamesData.map((game: any) => ({
      id: game.GameID.toString(),
      sport: 'NBA',
      home_team: game.HomeTeam,
      away_team: game.AwayTeam,
      game_time: game.DateTime || game.Day,
      status: mapStatus(game.Status),
      home_score: game.HomeTeamScore || 0,
      away_score: game.AwayTeamScore || 0,
    }))
  } catch (error) {
    console.error('Error fetching NBA games:', error)
    return getMockGames('NBA')
  }
}

export async function fetchPlayerProps(gameId: string, sport: 'NFL' | 'NBA'): Promise<PlayerProp[]> {
  if (sport === 'NBA') {
    return fetchNBAProps(gameId)
  }
  
  return getMockPlayerProps(gameId, sport)
}

async function fetchNBAProps(gameId: string): Promise<PlayerProp[]> {
  try {
    const date = '2025-12-19'
    const response = await fetch(`${NBA_BASE_URL}/odds/json/PlayerPropsByDate/${date}?key=${SPORTSDATA_API_KEY}`, {
      next: { revalidate: 300 }
    })
    
    if (!response.ok) {
      throw new Error(`SportsData NBA Props API error: ${response.status}`)
    }

    const propsData = await response.json()
    
    // Filter by gameId
    const filteredProps = propsData.filter((p: any) => p.GameID.toString() === gameId)
    
    return filteredProps.map((prop: any, index: number) => ({
      id: `${prop.PlayerID}-${prop.Description}-${index}`,
      game_id: prop.GameID.toString(),
      player_id: prop.PlayerID.toString(),
      player_name: prop.Name,
      prop_type: prop.Description,
      line: prop.OverUnder,
      over_odds: prop.OverPayout,
      under_odds: prop.UnderPayout,
      current_value: 0, // Not provided in this endpoint
      status: 'active',
    }))
  } catch (error) {
    console.error('Error fetching NBA props:', error)
    return getMockPlayerProps(gameId, 'NBA')
  }
}

function mapStatus(status: string): 'upcoming' | 'live' | 'completed' {
  const s = status.toLowerCase()
  if (s === 'scheduled' || s === 'upcoming') return 'upcoming'
  if (s === 'inprogress' || s === 'live') return 'live'
  if (s === 'final' || s === 'completed') return 'completed'
  return 'upcoming'
}

function getMockGames(sport: 'NFL' | 'NBA'): Game[] {
  const now = new Date()
  const upcoming = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  const live = new Date(now.getTime() - 1 * 60 * 60 * 1000)
  
  if (sport === 'NFL') {
    return [
      {
        id: 'nfl-1',
        sport: 'NFL',
        home_team: 'KC',
        away_team: 'BUF',
        game_time: live.toISOString(),
        status: 'live',
        home_score: 24,
        away_score: 21,
      },
      {
        id: 'nfl-2',
        sport: 'NFL',
        home_team: 'SF',
        away_team: 'DAL',
        game_time: upcoming.toISOString(),
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      },
    ]
  } else {
    return [
      {
        id: '22846',
        sport: 'NBA',
        home_team: 'BOS',
        away_team: 'MIA',
        game_time: '2025-12-19T19:00:00',
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      }
    ]
  }
}

function getMockPlayerProps(gameId: string, sport: 'NFL' | 'NBA'): PlayerProp[] {
  return []
}
