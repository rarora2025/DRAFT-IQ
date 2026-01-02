export interface User {
  id: string
  username: string
  email: string
  balance: number
  daily_start_value?: number
  last_reset_at?: string
  default_tolerance?: number
  created_at: string
}

    export interface Position {
        id: string
        user_id: string
        side: 'long' | 'short'
        size: number
        quantity: number
        entry_price: number
        entry_reference_value?: number
        created_at: string
        closed_at: string | null
        exit_price: number | null
        exit_reference_value?: number | null
        realized_pnl: number | null
        market_ticker?: string
        market_title?: string
        market_id?: string
        market_status?: string
        player_prop_id?: string
    }
  
  export interface NBAProp {
    id: string
    player_name: string
    team?: string
    sport?: string
    photo_url?: string
    prop_type: string
    line: number
    current_value: number
    status: 'PRE_GAME' | 'LIVE' | 'FROZEN' | 'SETTLED' | 'active' | 'LOCKED' | 'inactive' | 'locked'
    final_reference_value?: number | null
    updated_at?: string
    last_update?: string
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

export interface QueuedTrade {
  id: string
  user_id: string
  player_prop_id: string
  trade_type: 'open' | 'close'
  side?: 'long' | 'short'
  size: number
  submitted_price: number
  position_id?: string
  status: 'pending' | 'filled' | 'cancelled' | 'expired'
  market_title?: string
  created_at: string
  filled_at?: string
  filled_price?: number
  limit_price?: number
  cancelled_at?: string
  cancel_reason?: string
}
