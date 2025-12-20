const API_KEY = process.env.NEXT_PUBLIC_THE_ODDS_API_KEY || '81f1457908485e3694dbdbe279f815b2';
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

export interface Score {
  name: string;
  score: string;
}

export interface Game {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Score[] | null;
  last_update: string | null;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes?: Outcome[];
}

export interface Outcome {
  name: string;
  description?: string;
  price: number;
  point?: number;
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface OddsResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export const convertToEST = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  });
};

export async function getGames(sport: 'americanfootball_nfl' | 'basketball_nba'): Promise<Game[]> {
  const response = await fetch(
    `${BASE_URL}/${sport}/scores/?daysFrom=1&apiKey=${API_KEY}`
  );
  if (!response.ok) throw new Error('Failed to fetch games');
  return response.json();
}

export async function getEventMarkets(sport: string, eventId: string): Promise<Bookmaker[]> {
  const response = await fetch(
    `${BASE_URL}/${sport}/events/${eventId}/markets?apiKey=${API_KEY}&regions=us&bookmakers=fanduel,draftkings`
  );
  if (!response.ok) throw new Error('Failed to fetch markets');
  const data = await response.json();
  return data.bookmakers || [];
}

export async function getEventOdds(
  sport: string,
  eventId: string,
  markets: string = 'player_points'
): Promise<OddsResponse> {
  const response = await fetch(
    `${BASE_URL}/${sport}/events/${eventId}/odds?apiKey=${API_KEY}&regions=us&markets=${markets}&oddsFormat=american&bookmakers=fanduel,draftkings`
  );
  if (!response.ok) throw new Error('Failed to fetch odds');
  return response.json();
}
