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

const ODDS_API_KEY = process.env.ODDS_API_KEY || ''
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'

export async function fetchLiveGames(sport: 'NFL' | 'NBA'): Promise<Game[]> {
  if (!ODDS_API_KEY) {
    return getMockGames(sport)
  }

  try {
    const sportKey = sport === 'NFL' ? 'americanfootball_nfl' : 'basketball_nba'
    const response = await fetch(
      `${ODDS_API_BASE}/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`,
      { next: { revalidate: 30 } }
    )
    
    if (!response.ok) {
      return getMockGames(sport)
    }

    const data = await response.json()
    
    return data.map((game: any) => ({
      id: game.id,
      sport,
      home_team: game.home_team,
      away_team: game.away_team,
      game_time: game.commence_time,
      status: game.completed ? 'completed' : new Date(game.commence_time) < new Date() ? 'live' : 'upcoming',
      home_score: game.scores?.find((s: any) => s.name === game.home_team)?.score || 0,
      away_score: game.scores?.find((s: any) => s.name === game.away_team)?.score || 0,
    }))
  } catch (error) {
    console.error('Error fetching games:', error)
    return getMockGames(sport)
  }
}

export async function fetchPlayerProps(gameId: string, sport: 'NFL' | 'NBA'): Promise<PlayerProp[]> {
  return getMockPlayerProps(gameId, sport)
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
