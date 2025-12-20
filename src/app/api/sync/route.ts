import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGames, getEventOdds } from '@/lib/oddsApi';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const specificGameId = searchParams.get('gameId');
    
    const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    for (const sport of sports) {
      const games = await getGames(sport);
      const dbSport = sport === 'basketball_nba' ? 'NBA' : 'NFL';
      
      // Filter for live games or the specific game we want to update
      const gamesToSync = games.filter(g => 
        (specificGameId && g.id === specificGameId) || 
        (!g.completed && g.scores && g.scores.length > 0)
      );
      
      for (const game of gamesToSync) {
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
          const markets = dbSport === 'NBA' 
            ? 'player_points' 
            : 'player_pass_yds,player_rush_yds,player_reception_yds';
            
          const odds = await getEventOdds(game.sport_key, game.id, markets);
          const bookmaker = odds.bookmakers.find(b => b.key === 'fanduel') || odds.bookmakers[0];
          
          if (bookmaker) {
            for (const market of bookmaker.markets) {
              if (market.outcomes) {
                const playerOutcomes = new Map();
                market.outcomes.forEach(outcome => {
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
                        team: outcome.name === game.home_team ? game.home_team : game.away_team,
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
                        prop_type: market.key,
                        line: outcome.point,
                        status: 'active',
                        external_id: `${game.id}_${dbPlayer.id}_${market.key}`,
                        updated_at: new Date().toISOString(),
                      }, { onConflict: 'external_id' })
                      .select()
                      .single();

                  if (propError) console.error('Error upserting prop:', propError);
                  
                  if (dbProp) {
                    // 5. Record History if changed
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
          }
        } catch (oddsErr) {
          console.error(`Error fetching odds for game ${game.id}:`, oddsErr);
        }
      }
      allGames.push(...gamesToSync);
    }

    return NextResponse.json({ success: true, gamesSynced: allGames.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
