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
      
      for (const game of games) {
        const isCompleted = game.completed;
        
        // 1. Upsert Game
        const { data: dbGame, error: gameError } = await supabase
          .from('games')
          .upsert({
            external_id: game.id,
            sport: dbSport,
            home_team: game.home_team,
            away_team: game.away_team,
            game_time: game.commence_time,
            status: isCompleted ? 'completed' : (game.scores && game.scores.length > 0 ? 'live' : 'upcoming'),
            home_score: parseInt(game.scores?.find(s => s.name === game.home_team)?.score || '0'),
            away_score: parseInt(game.scores?.find(s => s.name === game.away_team)?.score || '0'),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'external_id' })
          .select()
          .single();

        if (gameError) console.error('Error upserting game:', gameError);
        if (!dbGame) continue;

          // 2. If game is completed, close all positions
          if (isCompleted) {
            const { data: props } = await supabase
              .from('player_props')
              .select('id, line, current_value')
              .eq('game_id', dbGame.id);

            if (props && props.length > 0) {
              const propIds = props.map(p => p.id);
              const { data: openPositions } = await supabase
                .from('positions')
                .select('*')
                .in('player_prop_id', propIds)
                .is('closed_at', null);

              if (openPositions && openPositions.length > 0) {
                for (const pos of openPositions) {
                  const prop = props.find(p => p.id === pos.player_prop_id);
                  const finalPrice = prop?.line || prop?.current_value || pos.entry_price;
                  
                  const diff = finalPrice - pos.entry_price;
                const pnl = pos.side === 'long'
                  ? Number(pos.size) * (diff / pos.entry_price)
                  : -Number(pos.size) * (diff / pos.entry_price);

                // Update position
                await supabase
                  .from('positions')
                  .update({
                    closed_at: new Date().toISOString(),
                    exit_price: finalPrice,
                    realized_pnl: pnl,
                  })
                  .eq('id', pos.id);

                // Update profile balance
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('balance')
                  .eq('id', pos.user_id)
                  .single();

                if (profile) {
                  const returnAmount = Math.max(0, Number(pos.size) + pnl);
                  await supabase
                    .from('profiles')
                    .update({ balance: Number(profile.balance) + returnAmount })
                    .eq('id', pos.user_id);
                }

                // Record trade
                await supabase.from('trades').insert({
                  user_id: pos.user_id,
                  position_id: pos.id,
                  action: 'close',
                  size: pos.size,
                  price: finalPrice,
                  market_title: pos.market_title
                });
              }
            }

            // Set props to inactive
            await supabase
              .from('player_props')
              .update({ status: 'inactive' })
              .in('id', propIds);
          }
          continue; // Move to next game
        }

        // 3. Fetch Player Props for this game (only for live/upcoming)
        if (!isCompleted && (specificGameId === game.id || (game.scores && game.scores.length > 0))) {
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
                          current_value: outcome.point,
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
      }
      allGames.push(...games);
    }

    return NextResponse.json({ success: true, gamesSynced: allGames.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
