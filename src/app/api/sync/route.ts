import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGames, getEventOdds } from '@/lib/oddsApi';

export async function GET() {
  try {
    const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    for (const sport of sports) {
      const games = await getGames(sport);
      // Map sport key to database allowed values
      const dbSport = sport === 'basketball_nba' ? 'NBA' : 'NFL';
      
      // Filter for live games: not completed and has scores or is around commence time
      // The user said "only show live games" to save API calls.
      const liveGames = games.filter(g => !g.completed && g.scores && g.scores.length > 0);
      
      for (const game of liveGames) {
        // 1. Upsert Game
        const { data: dbGame, error: gameError } = await supabase
          .from('games')
          .upsert({
            external_id: game.id,
            sport: dbSport,
            home_team: game.home_team,
            away_team: game.away_team,
            game_time: game.commence_time,
            status: 'live',
            home_score: parseInt(game.scores?.find(s => s.name === game.home_team)?.score || '0'),
            away_score: parseInt(game.scores?.find(s => s.name === game.away_team)?.score || '0'),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'external_id' })
          .select()
          .single();

        if (gameError) console.error('Error upserting game:', gameError);
        if (!dbGame) continue;

        // 2. Fetch Player Props for this game
        try {
          const odds = await getEventOdds(game.sport_key, game.id);
          const bookmaker = odds.bookmakers.find(b => b.key === 'fanduel') || odds.bookmakers[0];
          
          if (bookmaker) {
            const playerPointsMarket = bookmaker.markets.find(m => m.key === 'player_points');
            if (playerPointsMarket?.outcomes) {
              // Group by player (description) to avoid duplicates (over/under)
              const playerOutcomes = new Map();
              playerPointsMarket.outcomes.forEach(outcome => {
                if (outcome.description && !playerOutcomes.has(outcome.description)) {
                  playerOutcomes.set(outcome.description, outcome);
                }
              });

              for (const [playerName, outcome] of playerOutcomes) {
                  // 3. Upsert Player
                  let { data: dbPlayer, error: playerError } = await supabase
                    .from('players')
                    .upsert({
                      name: playerName,
                      team: outcome.name === game.home_team ? game.home_team : game.away_team, // Approximation
                      sport: dbSport,
                      external_id: `player_${playerName.replace(/\s+/g, '_').toLowerCase()}`
                    }, { onConflict: 'name, sport' })
                    .select()
                    .single();

                  if (playerError) {
                      const { data: existingPlayer } = await supabase
                        .from('players')
                        .select()
                        .eq('name', playerName)
                        .eq('sport', dbSport)
                        .single();
                      if (!existingPlayer) continue;
                      dbPlayer = existingPlayer;
                  }

                  if (!dbPlayer) continue;

                  // 4. Upsert Prop
                  const { data: dbProp, error: propError } = await supabase
                    .from('player_props')
                    .upsert({
                      game_id: dbGame.id,
                      player_id: dbPlayer.id,
                      prop_type: 'player_points',
                      line: outcome.point,
                      status: 'active',
                      external_id: `${game.id}_${dbPlayer.id}_player_points`,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'external_id' })
                    .select()
                    .single();

                if (propError) console.error('Error upserting prop:', propError);
                
                if (dbProp) {
                  // 5. Record History if changed or periodically
                  // Check last history entry
                  const { data: lastHistory } = await supabase
                    .from('prop_price_history')
                    .select('price')
                    .eq('prop_id', dbProp.id)
                    .order('timestamp', { ascending: false })
                    .limit(1)
                    .single();

                  if (!lastHistory || lastHistory.price !== outcome.point) {
                    await supabase.from('prop_price_history').insert({
                      prop_id: dbProp.id,
                      price: outcome.point,
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
              }
            }
          }
        } catch (oddsErr) {
          console.error(`Error fetching odds for game ${game.id}:`, oddsErr);
        }
      }
      allGames.push(...liveGames);
    }

    return NextResponse.json({ success: true, gamesSynced: allGames.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
