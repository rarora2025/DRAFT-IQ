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
  sport: 'NFL' | 'NBA'
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

const KALSHI_BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2'

export async function fetchLiveGames(sport: 'NFL' | 'NBA'): Promise<Game[]> {
  if (sport === 'NBA') {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${today}?key=${SPORTSDATA_API_KEY}`, {
        next: { revalidate: 30 }
      })
      
      if (!response.ok) {
        throw new Error(`SportsData API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data) || data.length === 0) {
        return getMockGames(sport)
      }

      return data.map((game: any) => ({
        id: game.GameID.toString(),
        sport: 'NBA',
        home_team: game.HomeTeam,
        away_team: game.AwayTeam,
        game_time: game.DateTime,
        status: mapSportsDataStatus(game.Status),
        home_score: game.HomeTeamScore || 0,
        away_score: game.AwayTeamScore || 0,
      }))
    } catch (error) {
      console.error('Error fetching NBA games from SportsData:', error)
      return getMockGames(sport)
    }
  }

  // Fallback to Kalshi for NFL or other sports
  try {
    const response = await fetch(`${KALSHI_BASE_URL}/markets?limit=200&status=open`, {
      next: { revalidate: 30 }
    })
    
    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`)
    }

    const data = await response.json()
    const markets = data.markets || []
    
    const sportMap: Record<string, string[]> = {
      'NFL': ['football'],
      'NBA': ['basketball']
    }
    
    const sportKeywords = sportMap[sport] || []
    const sportMarkets = markets.filter((m: any) => {
      const tags = (m.tags || []).map((t: string) => t.toLowerCase())
      const title = (m.title || '').toLowerCase()
      const category = (m.category || '').toLowerCase()
      
      return category === 'sports' || 
             sportKeywords.some(keyword => 
               tags.includes(keyword) || 
               title.includes(keyword)
             )
    })

    if (sportMarkets.length === 0) {
      console.log('No Kalshi markets found, using mock data')
      return getMockGames(sport)
    }

    const gameMap = new Map<string, Game>()
    
    sportMarkets.forEach((market: any) => {
      const eventTicker = market.event_ticker || market.ticker
      
      if (!gameMap.has(eventTicker)) {
        const teams = extractTeamsFromTitle(market.title)
        const gameTime = new Date(market.close_time || Date.now())
        const now = new Date()
        
        gameMap.set(eventTicker, {
          id: eventTicker,
          sport,
          home_team: teams.home,
          away_team: teams.away,
          game_time: gameTime.toISOString(),
          status: market.status === 'closed' ? 'completed' : gameTime < now ? 'live' : 'upcoming',
          home_score: 0,
          away_score: 0,
        })
      }
    })

    const games = Array.from(gameMap.values()).slice(0, 20)
    console.log(`Fetched ${games.length} Kalshi games for ${sport}`)
    return games.length > 0 ? games : getMockGames(sport)
  } catch (error) {
    console.error('Error fetching Kalshi games:', error)
    return getMockGames(sport)
  }
}

function mapSportsDataStatus(status: string): 'upcoming' | 'live' | 'completed' {
  const s = status.toLowerCase()
  if (s === 'final' || s === 'completed') return 'completed'
  if (s === 'scheduled' || s === 'upcoming') return 'upcoming'
  return 'live'
}

const SPORTSDATA_API_KEY = 'd3f707b88cf14debb99a7330aca477a7'
const SPORTSDATA_BASE_URL = 'https://api.sportsdata.io/v3/nba/odds/json'

export async function fetchPlayerProps(gameId: string, sport: 'NFL' | 'NBA'): Promise<PlayerProp[]> {
  if (sport === 'NBA') {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`${SPORTSDATA_BASE_URL}/PlayerPropsByDate/${today}?key=${SPORTSDATA_API_KEY}`, {
        next: { revalidate: 30 }
      })
      
      if (!response.ok) {
        throw new Error(`SportsData API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Filter props for the specific game if gameId is provided
      // SportsData GameID is a number, we compare as string
      const gameProps = data.filter((prop: any) => 
        !gameId || prop.GameID.toString() === gameId || gameId === 'nba-1' // allow mock gameId for testing
      )

      if (gameProps.length === 0 && data.length > 0) {
        // If no props for this specific game, but we have data, return some data anyway for demo
        return data.slice(0, 20).map(mapSportsDataToProp)
      }

      const props: PlayerProp[] = gameProps.map(mapSportsDataToProp)
      return props.length > 0 ? props : getMockPlayerProps(gameId, sport)
    } catch (error) {
      console.error('Error fetching SportsData player props:', error)
      return getMockPlayerProps(gameId, sport)
    }
  }

  // Fallback to Kalshi for NFL or other sports
  try {
    const response = await fetch(`${KALSHI_BASE_URL}/markets?event_ticker=${gameId}&limit=100&status=open`, {
      next: { revalidate: 30 }
    })
    
    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`)
    }

    const data = await response.json()
    const markets = data.markets || []
    
    if (markets.length === 0) {
      return getMockPlayerProps(gameId, sport)
    }

    const props: PlayerProp[] = markets.slice(0, 20).map((market: any) => {
      const propInfo = extractPropInfo(market.title, market.subtitle || '')
      const yesPrice = (market.yes_ask || 50) / 100
      const noPrice = (market.no_ask || 50) / 100
      
      return {
        id: market.ticker,
        game_id: gameId,
        player_id: propInfo.playerId,
        player_name: propInfo.playerName,
        prop_type: propInfo.propType,
        line: propInfo.line,
        over_odds: calculateOdds(yesPrice),
        under_odds: calculateOdds(noPrice),
        current_value: propInfo.line * yesPrice,
        status: market.status === 'closed' ? 'settled' : 'active',
      }
    })

    return props.length > 0 ? props : getMockPlayerProps(gameId, sport)
  } catch (error) {
    console.error('Error fetching Kalshi player props:', error)
    return getMockPlayerProps(gameId, sport)
  }
}

function mapSportsDataToProp(prop: any): PlayerProp {
  return {
    id: `${prop.PlayerID}-${prop.Description.replace(/\s+/g, '-')}-${prop.GameID}`,
    game_id: prop.GameID.toString(),
    player_id: prop.PlayerID.toString(),
    player_name: prop.Name,
    prop_type: prop.Description,
    line: prop.OverUnder,
    over_odds: prop.OverPayout || -110,
    under_odds: prop.UnderPayout || -110,
    current_value: prop.StatResult || 0,
    status: 'active',
  }
}

function extractTeamsFromTitle(title: string): { home: string; away: string } {
  const vsMatch = title.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s+\||$)/i)
  if (vsMatch) {
    return { away: vsMatch[1].trim(), home: vsMatch[2].trim() }
  }
  
  const atMatch = title.match(/(.+?)\s+@\s+(.+?)(?:\s+\||$)/i)
  if (atMatch) {
    return { away: atMatch[1].trim(), home: atMatch[2].trim() }
  }

  return { home: 'Team 1', away: 'Team 2' }
}

function extractPropInfo(title: string, subtitle: string): {
  playerName: string
  playerId: string
  propType: string
  line: number
} {
  const playerMatch = title.match(/^([A-Za-z\s\.]+?)(?:\s+to|\s+will|\s+over|\s+under)/i)
  const playerName = playerMatch ? playerMatch[1].trim() : 'Unknown Player'
  
  let propType = 'Points'
  if (title.toLowerCase().includes('passing')) propType = 'Passing Yards'
  else if (title.toLowerCase().includes('rushing')) propType = 'Rushing Yards'
  else if (title.toLowerCase().includes('receiving')) propType = 'Receiving Yards'
  else if (title.toLowerCase().includes('rebound')) propType = 'Rebounds'
  else if (title.toLowerCase().includes('assist')) propType = 'Assists'
  else if (title.toLowerCase().includes('touchdown')) propType = 'Touchdowns'
  
  const lineMatch = subtitle.match(/(over|under)\s+([\d.]+)/i)
  const line = lineMatch ? parseFloat(lineMatch[2]) : 0

  return {
    playerName,
    playerId: playerName.toLowerCase().replace(/\s+/g, '-'),
    propType,
    line,
  }
}

function calculateOdds(price: number): number {
  if (price >= 0.5) {
    return Math.round(-100 * (price / (1 - price)))
  } else {
    return Math.round(100 * ((1 - price) / price))
  }
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
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        game_time: live.toISOString(),
        status: 'live',
        home_score: 24,
        away_score: 21,
      },
      {
        id: 'nfl-2',
        sport: 'NFL',
        home_team: 'San Francisco 49ers',
        away_team: 'Dallas Cowboys',
        game_time: upcoming.toISOString(),
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      },
      {
        id: 'nfl-3',
        sport: 'NFL',
        home_team: 'Philadelphia Eagles',
        away_team: 'New York Giants',
        game_time: new Date(upcoming.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      },
    ]
  } else {
    return [
      {
        id: 'nba-1',
        sport: 'NBA',
        home_team: 'Los Angeles Lakers',
        away_team: 'Boston Celtics',
        game_time: live.toISOString(),
        status: 'live',
        home_score: 98,
        away_score: 103,
      },
      {
        id: 'nba-2',
        sport: 'NBA',
        home_team: 'Golden State Warriors',
        away_team: 'Phoenix Suns',
        game_time: upcoming.toISOString(),
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      },
      {
        id: 'nba-3',
        sport: 'NBA',
        home_team: 'Miami Heat',
        away_team: 'Milwaukee Bucks',
        game_time: new Date(upcoming.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming',
        home_score: 0,
        away_score: 0,
      },
    ]
  }
}

function getMockPlayerProps(gameId: string, sport: 'NFL' | 'NBA'): PlayerProp[] {
  if (sport === 'NFL') {
    return [
      {
        id: 'prop-nfl-1',
        game_id: gameId,
        player_id: 'player-1',
        player_name: 'Patrick Mahomes',
        prop_type: 'Passing Yards',
        line: 285.5,
        over_odds: -110,
        under_odds: -110,
        current_value: 247,
        status: 'active',
      },
      {
        id: 'prop-nfl-2',
        game_id: gameId,
        player_id: 'player-2',
        player_name: 'Patrick Mahomes',
        prop_type: 'Passing TDs',
        line: 2.5,
        over_odds: +105,
        under_odds: -130,
        current_value: 2,
        status: 'active',
      },
      {
        id: 'prop-nfl-3',
        game_id: gameId,
        player_id: 'player-3',
        player_name: 'Travis Kelce',
        prop_type: 'Receiving Yards',
        line: 67.5,
        over_odds: -115,
        under_odds: -105,
        current_value: 54,
        status: 'active',
      },
      {
        id: 'prop-nfl-4',
        game_id: gameId,
        player_id: 'player-4',
        player_name: 'Isiah Pacheco',
        prop_type: 'Rushing Yards',
        line: 52.5,
        over_odds: -110,
        under_odds: -110,
        current_value: 38,
        status: 'active',
      },
    ]
  } else {
    return [
      {
        id: 'prop-nba-1',
        game_id: gameId,
        player_id: 'player-5',
        player_name: 'LeBron James',
        prop_type: 'Points',
        line: 27.5,
        over_odds: -115,
        under_odds: -105,
        current_value: 23,
        status: 'active',
      },
      {
        id: 'prop-nba-2',
        game_id: gameId,
        player_id: 'player-5',
        player_name: 'LeBron James',
        prop_type: 'Rebounds',
        line: 7.5,
        over_odds: -110,
        under_odds: -110,
        current_value: 6,
        status: 'active',
      },
      {
        id: 'prop-nba-3',
        game_id: gameId,
        player_id: 'player-5',
        player_name: 'LeBron James',
        prop_type: 'Assists',
        line: 6.5,
        over_odds: -105,
        under_odds: -115,
        current_value: 5,
        status: 'active',
      },
      {
        id: 'prop-nba-4',
        game_id: gameId,
        player_id: 'player-6',
        player_name: 'Anthony Davis',
        prop_type: 'Points',
        line: 24.5,
        over_odds: -110,
        under_odds: -110,
        current_value: 28,
        status: 'active',
      },
      {
        id: 'prop-nba-5',
        game_id: gameId,
        player_id: 'player-6',
        player_name: 'Anthony Davis',
        prop_type: 'Rebounds',
        line: 11.5,
        over_odds: -120,
        under_odds: +100,
        current_value: 9,
        status: 'active',
      },
    ]
  }
}
