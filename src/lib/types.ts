export interface Position {
  id: string
  user_id: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  exit_price: number | null
  realized_pnl: number | null
  created_at: string
  closed_at: string | null
  prop_id?: string
  player_name?: string
  stat_type?: string
}

export interface Trade {
  id: string
  user_id: string
  position_id: string
  action: 'buy' | 'sell' | 'close'
  size: number
  price: number
  created_at: string
}

export interface Game {
  id: string
  sport: 'NBA' | 'NFL'
  home_team: string
  away_team: string
  commence_time: string
  is_live: boolean
  home_score?: number
  away_score?: number
}

export interface Player {
  id: string
  name: string
  team: string
  position: string
  sport: 'NBA' | 'NFL'
}

export interface PlayerProp {
  id: string
  game_id: string
  player_name: string
  player_team: string
  stat_type: string
  line: number
  over_price: number
  under_price: number
  projection: number
  last_updated: string
  history: PropHistory[]
}

export interface PropHistory {
  time: string
  projection: number
}

export type StatType = 
  | 'player_points' 
  | 'player_rebounds' 
  | 'player_assists'
  | 'player_threes'
  | 'player_pass_yds'
  | 'player_pass_tds'
  | 'player_rush_yds'
  | 'player_receptions'
  | 'player_reception_yds'

export const STAT_LABELS: Record<StatType, string> = {
  player_points: 'Points',
  player_rebounds: 'Rebounds',
  player_assists: 'Assists',
  player_threes: '3-Pointers Made',
  player_pass_yds: 'Passing Yards',
  player_pass_tds: 'Passing TDs',
  player_rush_yds: 'Rushing Yards',
  player_receptions: 'Receptions',
  player_reception_yds: 'Receiving Yards',
}
