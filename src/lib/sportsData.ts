interface Game {
  id: string
  sport: 'NBA'
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
  sport: 'NBA'
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

export async function fetchLiveGames(): Promise<Game[]> {
  return fetchNBAGames()
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
    return getMockGames()
  }
}

export async function fetchPlayerProps(gameId: string): Promise<PlayerProp[]> {
  return fetchNBAProps(gameId)
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
        current_value: prop.OverUnder, // Default to the line since live progress isn't in this endpoint
        status: 'active',
      }))
  } catch (error) {
    console.error('Error fetching NBA props:', error)
    return []
  }
}

function mapStatus(status: string): 'upcoming' | 'live' | 'completed' {
  const s = (status || '').toLowerCase()
  if (s === 'scheduled' || s === 'upcoming') return 'upcoming'
  if (s === 'inprogress' || s === 'live') return 'live'
  if (s === 'final' || s === 'completed') return 'completed'
  return 'upcoming'
}

function getMockGames(): Game[] {
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
