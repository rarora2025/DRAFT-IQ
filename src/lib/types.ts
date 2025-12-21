export interface User {
  id: string
  username: string
  email: string
  balance: number
  daily_start_value?: number
  last_reset_at?: string
  created_at: string
}

export interface Position {
  id: string
  user_id: string
  side: 'long' | 'short'
  size: number
  entry_price: number
  created_at: string
  closed_at: string | null
  exit_price: number | null
  realized_pnl: number | null
  market_ticker?: string
  market_title?: string
  market_id?: string
}

export interface Trade {
  id: string
  user_id: string
  position_id: string | null
  action: 'buy' | 'sell' | 'close'
  size: number
  price: number
  created_at: string
  market_title?: string
}

export interface Projection {
  id: string
  temperature: number
  created_at: string
}

export interface LeaderboardEntry {
  username: string
  balance: number
  unrealized_pnl: number
  total_value: number
  percent_gain: number
  rank: number
}
