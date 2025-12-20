import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Fetch live games from database (which are synced by the background worker)
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'live')
      .order('game_time', { ascending: true });

    if (error) throw error;
    
    const formattedGames = games.map(game => ({
      id: game.external_id,
      sport: game.sport,
      home_team: game.home_team,
      away_team: game.away_team,
      game_time: game.game_time,
      status: game.status,
      home_score: game.home_score?.toString() || '0',
      away_score: game.away_score?.toString() || '0',
      sport_key: game.sport === 'NBA' ? 'basketball_nba' : 'americanfootball_nfl'
    }));

    return NextResponse.json({ games: formattedGames })
  } catch (error) {
    console.error('Error fetching games from DB:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
