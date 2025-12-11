const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2'

export interface KalshiMarket {
  ticker: string
  title: string
  subtitle: string
  status: string
  yes_bid: number
  yes_ask: number
  no_bid: number
  no_ask: number
  last_price: number
  volume: number
  volume_24h: number
  open_interest: number
  expiration_time: string
  event_ticker: string
  category: string
  result?: string
  yes_sub_title?: string
  no_sub_title?: string
}

export interface KalshiEvent {
  event_ticker: string
  title: string
  category: string
  series_ticker: string
  markets: KalshiMarket[]
  strike_date?: string
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[]
  cursor?: string
}

export interface KalshiEventsResponse {
  events: KalshiEvent[]
  cursor?: string
}

export async function getMarkets(params?: {
  limit?: number
  cursor?: string
  status?: 'open' | 'closed' | 'settled'
  series_ticker?: string
  event_ticker?: string
}): Promise<KalshiMarketsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.series_ticker) searchParams.set('series_ticker', params.series_ticker)
  if (params?.event_ticker) searchParams.set('event_ticker', params.event_ticker)

  const url = `${KALSHI_API_BASE}/markets${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Kalshi API error: ${res.status}`)
  }
  
  return res.json()
}

export async function getEvents(params?: {
  limit?: number
  cursor?: string
  status?: 'open' | 'closed' | 'settled'
  series_ticker?: string
  with_nested_markets?: boolean
}): Promise<KalshiEventsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.cursor) searchParams.set('cursor', params.cursor)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.series_ticker) searchParams.set('series_ticker', params.series_ticker)
  if (params?.with_nested_markets) searchParams.set('with_nested_markets', 'true')

  const url = `${KALSHI_API_BASE}/events${searchParams.toString() ? `?${searchParams}` : ''}`
  
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 60 }
  })
  
  if (!res.ok) {
    throw new Error(`Kalshi API error: ${res.status}`)
  }
  
  return res.json()
}

export async function getMarket(ticker: string): Promise<{ market: KalshiMarket }> {
  const res = await fetch(`${KALSHI_API_BASE}/markets/${ticker}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 30 }
  })
  
  if (!res.ok) {
    throw new Error(`Kalshi API error: ${res.status}`)
  }
  
  return res.json()
}

export function formatPrice(cents: number): string {
  return `${cents}¢`
}

export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 100 / 1000000).toFixed(1)}M`
  }
  if (volume >= 1000) {
    return `$${Math.floor(volume / 100 / 1000)}K`
  }
  return `$${Math.floor(volume / 100)}`
}

export function getTimeRemaining(expirationTime: string): string {
  const expiration = new Date(expirationTime)
  const now = new Date()
  const diff = expiration.getTime() - now.getTime()
  
  if (diff <= 0) return 'Expired'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
