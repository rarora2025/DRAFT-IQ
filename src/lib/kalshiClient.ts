interface KalshiConfig {
  apiKey?: string
  privateKey?: string
  baseUrl?: string
}

interface KalshiMarket {
  ticker: string
  event_ticker: string
  title: string
  subtitle: string
  yes_bid: number
  yes_ask: number
  no_bid: number
  no_ask: number
  last_price: number
  close_time: string
  status: string
  volume: number
  open_interest: number
  category: string
  tags: string[]
}

interface KalshiEvent {
  event_ticker: string
  title: string
  category: string
  series_ticker: string
  strike_date: string
  mutually_exclusive: boolean
  tags: string[]
}

interface KalshiSeriesCategory {
  category: string
  tags: string[]
}

class KalshiClient {
  private baseUrl: string
  private apiKey?: string
  private privateKey?: string

  constructor(config: KalshiConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://api.elections.kalshi.com/trade-api/v2'
    this.apiKey = config.apiKey || process.env.KALSHI_API_KEY
    this.privateKey = config.privateKey || process.env.KALSHI_PRIVATE_KEY
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getTagsForSeriesCategories(): Promise<Record<string, string[]>> {
    try {
      const data = await this.request<{ tags_by_category: Record<string, string[]> }>('/search/tags_for_series_categories')
      return data.tags_by_category || {}
    } catch (error) {
      console.error('Error fetching tags for series categories:', error)
      return {}
    }
  }

  async getMarkets(params?: {
    limit?: number
    cursor?: string
    event_ticker?: string
    series_ticker?: string
    status?: string
    tickers?: string
    tags?: string
  }): Promise<{ markets: KalshiMarket[]; cursor?: string }> {
    try {
      const queryParams = new URLSearchParams()
      
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.cursor) queryParams.append('cursor', params.cursor)
      if (params?.event_ticker) queryParams.append('event_ticker', params.event_ticker)
      if (params?.series_ticker) queryParams.append('series_ticker', params.series_ticker)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.tickers) queryParams.append('tickers', params.tickers)
      if (params?.tags) queryParams.append('tags', params.tags)

      const query = queryParams.toString()
      const endpoint = `/markets${query ? `?${query}` : ''}`
      
      const data = await this.request<{ markets: KalshiMarket[]; cursor?: string }>(endpoint)
      return data
    } catch (error) {
      console.error('Error fetching markets:', error)
      return { markets: [] }
    }
  }

  async getEvents(params?: {
    limit?: number
    cursor?: string
    series_ticker?: string
    status?: string
    tags?: string
  }): Promise<{ events: KalshiEvent[]; cursor?: string }> {
    try {
      const queryParams = new URLSearchParams()
      
      if (params?.limit) queryParams.append('limit', params.limit.toString())
      if (params?.cursor) queryParams.append('cursor', params.cursor)
      if (params?.series_ticker) queryParams.append('series_ticker', params.series_ticker)
      if (params?.status) queryParams.append('status', params.status)
      if (params?.tags) queryParams.append('tags', params.tags)

      const query = queryParams.toString()
      const endpoint = `/events${query ? `?${query}` : ''}`
      
      const data = await this.request<{ events: KalshiEvent[]; cursor?: string }>(endpoint)
      return data
    } catch (error) {
      console.error('Error fetching events:', error)
      return { events: [] }
    }
  }

  async getSportMarkets(sportTags: string[]): Promise<KalshiMarket[]> {
    const allMarkets: KalshiMarket[] = []
    
    for (const tag of sportTags) {
      const { markets } = await this.getMarkets({
        tags: tag,
        status: 'open',
        limit: 100,
      })
      allMarkets.push(...markets)
    }

    return allMarkets
  }
}

export const kalshiClient = new KalshiClient()

export type { KalshiMarket, KalshiEvent, KalshiSeriesCategory }
