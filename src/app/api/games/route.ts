import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Fetch live games from database (which are synced by the background worker)
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['live', 'upcoming'])
      .order('game_time', { ascending: true });

    if (error) throw error;

    // Additional safety: filter out games that are > 6 hours old even if DB thinks they are live
    const now = new Date().getTime();
    const activeGames = games.filter(game => {
      const gameTime = new Date(game.game_time).getTime();
      return now - gameTime < 6 * 60 * 60 * 1000;
    });
    
    const formattedGames = activeGames.map(game => ({
      id: game.external_id,
      sport: game.sport,
      home_team: game.home_team,
      away_team: game.away_team,
      game_time: game.game_time,
      status: game.status,
      home_score: game.home_score?.toString() || '0',
      away_score: game.away_score?.toString() || '0',
      sport_key: game.sport === 'NBA' ? 'basketball_nba' : 'americanfootball_nfl',
      updated_at: game.updated_at
    }));

    return NextResponse.json(
      { games: formattedGames },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching games from DB:', error)
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    )
  }
}
