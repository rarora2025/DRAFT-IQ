import type { Game, PlayerProp, PropHistory } from './types'

// Mock data that simulates live scraping from sportsbook
// In production, this would call The Odds API or scrape DraftKings

const NBA_TEAMS = [
  'Lakers', 'Warriors', 'Celtics', 'Heat', 'Bucks',
  'Nuggets', 'Suns', 'Mavericks', '76ers', 'Knicks'
]

const NFL_TEAMS = [
  'Chiefs', '49ers', 'Eagles', 'Bills', 'Cowboys',
  'Ravens', 'Bengals', 'Packers', 'Dolphins', 'Lions'
]

const NBA_PLAYERS = [
  { name: 'LeBron James', team: 'Lakers', position: 'SF' },
  { name: 'Stephen Curry', team: 'Warriors', position: 'PG' },
  { name: 'Jayson Tatum', team: 'Celtics', position: 'SF' },
  { name: 'Giannis Antetokounmpo', team: 'Bucks', position: 'PF' },
  { name: 'Luka Doncic', team: 'Mavericks', position: 'PG' },
  { name: 'Kevin Durant', team: 'Suns', position: 'SF' },
  { name: 'Joel Embiid', team: '76ers', position: 'C' },
  { name: 'Nikola Jokic', team: 'Nuggets', position: 'C' },
]

const NFL_PLAYERS = [
  { name: 'Patrick Mahomes', team: 'Chiefs', position: 'QB' },
  { name: 'Josh Allen', team: 'Bills', position: 'QB' },
  { name: 'Jalen Hurts', team: 'Eagles', position: 'QB' },
  { name: 'Lamar Jackson', team: 'Ravens', position: 'QB' },
  { name: 'Christian McCaffrey', team: '49ers', position: 'RB' },
  { name: 'Tyreek Hill', team: 'Dolphins', position: 'WR' },
  { name: 'Travis Kelce', team: 'Chiefs', position: 'TE' },
  { name: 'CeeDee Lamb', team: 'Cowboys', position: 'WR' },
]

// Generate mock games
export function generateMockGames(): Game[] {
  const games: Game[] = []
  const now = new Date()
  
  // NBA Games
  for (let i = 0; i < 4; i++) {
    const homeTeam = NBA_TEAMS[i * 2]
    const awayTeam = NBA_TEAMS[i * 2 + 1]
    const commenceTime = new Date(now.getTime() + (i + 1) * 3600000)
    
    games.push({
      id: `nba-${i}`,
      sport: 'NBA',
      home_team: homeTeam,
      away_team: awayTeam,
      commence_time: commenceTime.toISOString(),
      is_live: i === 0,
      home_score: i === 0 ? Math.floor(Math.random() * 30) + 80 : undefined,
      away_score: i === 0 ? Math.floor(Math.random() * 30) + 80 : undefined,
    })
  }
  
  // NFL Games
  for (let i = 0; i < 3; i++) {
    const homeTeam = NFL_TEAMS[i * 2]
    const awayTeam = NFL_TEAMS[i * 2 + 1]
    const commenceTime = new Date(now.getTime() + (i + 5) * 3600000)
    
    games.push({
      id: `nfl-${i}`,
      sport: 'NFL',
      home_team: homeTeam,
      away_team: awayTeam,
      commence_time: commenceTime.toISOString(),
      is_live: false,
    })
  }
  
  return games
}

// Generate player props for a game
export function generatePlayerProps(game: Game): PlayerProp[] {
  const props: PlayerProp[] = []
  const players = game.sport === 'NBA' ? NBA_PLAYERS : NFL_PLAYERS
  
  // Filter players by teams in the game
  const gamePlayers = players.filter(
    p => p.team === game.home_team || p.team === game.away_team
  )
  
  gamePlayers.forEach(player => {
    const statTypes = game.sport === 'NBA' 
      ? ['player_points', 'player_rebounds', 'player_assists', 'player_threes']
      : ['player_pass_yds', 'player_pass_tds', 'player_rush_yds', 'player_reception_yds']
    
    statTypes.forEach(statType => {
      const baseLine = getBaseLineForStat(statType, player.position)
      const line = baseLine + (Math.random() - 0.5) * (baseLine * 0.2)
      const projection = line + (Math.random() - 0.5) * (line * 0.1)
      
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
      
      props.push({
        id: `${game.id}-${player.name.replace(/\s+/g, '-')}-${statType}`,
        game_id: game.id,
        player_name: player.name,
        player_team: player.team,
        stat_type: statType,
        line: Math.round(line * 10) / 10,
        over_price: -110 + Math.floor(Math.random() * 20) - 10,
        under_price: -110 + Math.floor(Math.random() * 20) - 10,
        projection: Math.round(projection * 10) / 10,
        last_updated: now.toISOString(),
        history: [{
          time: timeStr,
          projection: Math.round(projection * 10) / 10,
        }],
      })
    })
  })
  
  return props
}

function getBaseLineForStat(statType: string, position: string): number {
  const baseLines: Record<string, number> = {
    player_points: 25,
    player_rebounds: 8,
    player_assists: 6,
    player_threes: 3,
    player_pass_yds: position === 'QB' ? 275 : 0,
    player_pass_tds: position === 'QB' ? 2 : 0,
    player_rush_yds: position === 'RB' ? 75 : position === 'QB' ? 30 : 0,
    player_receptions: position === 'WR' || position === 'TE' ? 6 : 0,
    player_reception_yds: position === 'WR' ? 75 : position === 'TE' ? 55 : 0,
  }
  
  return baseLines[statType] || 10
}

// Simulate live projection updates (mimics scraping)
export function updatePropProjection(prop: PlayerProp): PlayerProp {
  const volatility = 0.02 // 2% movement per update
  const trend = (Math.random() - 0.5) * 2 // Random walk
  
  const change = prop.line * volatility * trend
  const newProjection = Math.max(
    prop.line * 0.5,
    Math.min(prop.line * 1.5, prop.projection + change)
  )
  
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  
  const newHistory = [
    ...prop.history.slice(-29),
    {
      time: timeStr,
      projection: Math.round(newProjection * 10) / 10,
    },
  ]
  
  return {
    ...prop,
    projection: Math.round(newProjection * 10) / 10,
    last_updated: now.toISOString(),
    history: newHistory,
  }
}

// Fetch all games (simulates API call)
export async function fetchGames(): Promise<Game[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))
  return generateMockGames()
}

// Fetch props for a specific game (simulates scraping)
export async function fetchGameProps(gameId: string): Promise<PlayerProp[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const games = generateMockGames()
  const game = games.find(g => g.id === gameId)
  
  if (!game) return []
  
  return generatePlayerProps(game)
}
