import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sports_enabled')
      .single()
    
    const sportsEnabled = settingsData?.value || { NBA: true, NFL: true }
    const enabledSports = Object.entries(sportsEnabled)
      .filter(([_, enabled]) => enabled)
      .map(([sport]) => sport)

    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .in('status', ['live', 'upcoming'])
      .in('sport', enabledSports.length > 0 ? enabledSports : ['NONE'])
      .order('game_time', { ascending: true });

    if (error) throw error;

    // Additional safety: filter out games that are > 6 hours old even if DB thinks they are live
    const now = new Date().getTime();
    const activeGames = games.filter(game => {
      // Always show the simulator game if it's live
      if (game.external_id === 'sim_live_test_game' && game.status === 'live') return true;
      
      const gameTime = new Date(game.game_time).getTime();
      return now - gameTime < 6 * 60 * 60 * 1000;
    });
    
        const formattedGames = activeGames.map(game => ({
          id: game.external_id,
          db_id: game.id,
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
