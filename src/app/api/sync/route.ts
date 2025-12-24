import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGames, getEventOdds } from '@/lib/oddsApi';
import { logEvent } from '@/lib/analytics';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const specificGameId = searchParams.get('gameId');
    const force = searchParams.get('force') === 'true';
    
    const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    // 0. Mark stale props as FROZEN (older than 10 mins)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await supabase
      .from('player_props')
      .update({ status: 'FROZEN' })
      .eq('status', 'LIVE')
      .lt('updated_at', tenMinsAgo);

    // Fetch games with active positions to prioritize them
    const { data: activePositions } = await supabase
      .from('positions')
      .select('player_prop_id')
      .is('closed_at', null);
    
    const activePropIds = activePositions?.map(p => p.player_prop_id) || [];
    const { data: activeGames } = await supabase
      .from('player_props')
      .select('game_id')
      .in('id', activePropIds);
    
    const activeGameIds = new Set(activeGames?.map(g => g.game_id) || []);

    for (const sport of sports) {
      const dbSport = sport === 'basketball_nba' ? 'NBA' : 'NFL';
      
      // OPTIMIZATION: Check if we need to fetch games list for this sport
      const { data: latestGameUpdate } = await supabase
        .from('games')
        .select('updated_at')
        .eq('sport', dbSport)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      const lastUpdate = latestGameUpdate ? new Date(latestGameUpdate.updated_at).getTime() : 0;
      const shouldFetchGames = force || (Date.now() - lastUpdate > 10 * 60 * 1000); // 10 mins

      let games = [];
      if (shouldFetchGames) {
        games = await getGames(sport);
      } else {
        const { data: dbGames } = await supabase
          .from('games')
          .select('*')
          .eq('sport', dbSport);
        
        // Map DB games back to Odds API structure for the loop
        games = (dbGames || []).map(g => ({
          id: g.external_id,
          sport_key: sport,
          home_team: g.home_team,
          away_team: g.away_team,
          commence_time: g.game_time,
          completed: g.status === 'completed',
          scores: g.home_score !== null ? [
            { name: g.home_team, score: g.home_score.toString() },
            { name: g.away_team, score: g.away_score.toString() }
          ] : null
        }));
      }

      for (const game of games) {
        const gameTime = new Date(game.commence_time).getTime();
        const now = new Date().getTime();
        const isOld = now - gameTime > 6 * 60 * 60 * 1000;
        const isCompleted = game.completed || isOld;
        const isLive = game.scores && game.scores.length > 0;
        
        // 1. Upsert Game
        const { data: dbGame, error: gameError } = await supabase
          .from('games')
          .upsert({
            external_id: game.id,
            sport: dbSport,
            home_team: game.home_team,
            away_team: game.away_team,
            game_time: game.commence_time,
            status: isCompleted ? 'completed' : (isLive ? 'live' : 'upcoming'),
            home_score: parseInt(game.scores?.find(s => s.name === game.home_team)?.score || '0'),
            away_score: parseInt(game.scores?.find(s => s.name === game.away_team)?.score || '0'),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'external_id' })
          .select()
          .single();

        if (gameError) console.error('Error upserting game:', gameError);
        if (!dbGame) continue;

        // 2. If game is completed, settle all markets
        if (isCompleted) {
          const { data: props } = await supabase
            .from('player_props')
            .select('id, line, current_value')
            .eq('game_id', dbGame.id)
            .neq('status', 'SETTLED');

          if (props && props.length > 0) {
            for (const prop of props) {
              const finalValue = prop.current_value || prop.line || 0;
              await supabase.rpc('settle_market', {
                p_player_prop_id: prop.id,
                p_final_value: finalValue
              });
            }
          }
          continue;
        }

        // 3. OPTIMIZATION: Only fetch Odds/Props if:
        // - Specific game requested
        // - Game is live AND has active positions
        // - Game is live AND hasn't been updated in 5 mins
        const { data: propUpdate } = await supabase
          .from('player_props')
          .select('updated_at')
          .eq('game_id', dbGame.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        const lastPropUpdate = propUpdate ? new Date(propUpdate.updated_at).getTime() : 0;
        const needsPropUpdate = force || 
          (specificGameId === game.id) || 
          (isLive && activeGameIds.has(dbGame.id)) ||
          (isLive && (Date.now() - lastPropUpdate > 5 * 60 * 1000));

        if (!isCompleted && needsPropUpdate) {
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
                      let { data: dbPlayer, error: playerError } = await supabase
                        .from('players')
                        .upsert({
                          name: playerName,
                          team: null,
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

                      // Fetch existing prop to compare for instrumentation
                      const { data: existingProp } = await supabase
                        .from('player_props')
                        .select('id, line, current_value')
                        .eq('external_id', `${game.id}_${dbPlayer.id}_${market.key}`)
                        .maybeSingle();

                      const { data: dbProp, error: propError } = await supabase
                        .from('player_props')
                        .upsert({
                          game_id: dbGame.id,
                          player_id: dbPlayer.id,
                          prop_type: market.key,
                          line: outcome.point,
                          current_value: outcome.point,
                          status: isLive ? 'LIVE' : 'PRE_GAME',
                          external_id: `${game.id}_${dbPlayer.id}_${market.key}`,
                          updated_at: new Date().toISOString(),
                        }, { onConflict: 'external_id' })
                        .select()
                        .single();

                      if (propError) console.error('Error upserting prop:', propError);
                      
                      if (dbProp) {
                        // Log reference_updated if value changed
                        if (existingProp) {
                          const oldVal = existingProp.current_value || existingProp.line || 0;
                          const newVal = outcome.point;
                          if (oldVal !== newVal) {
                            await logEvent('reference_updated', null, dbProp.id, {
                              old_value: oldVal,
                              new_value: newVal,
                              delta: newVal - oldVal,
                              cause: 'market_sync'
                            });
                          }
                        }

                        const { data: lastHistory } = await supabase

                        .from('prop_price_history')
                        .select('price, timestamp')
                        .eq('prop_id', dbProp.id)
                        .order('timestamp', { ascending: false })
                        .limit(1)
                        .single();

                      const now = new Date();
                      const lastTime = lastHistory ? new Date(lastHistory.timestamp) : new Date(0);
                      const minsSince = (now.getTime() - lastTime.getTime()) / (1000 * 60);

                      if (!lastHistory || lastHistory.price !== outcome.point || minsSince >= 5) {
                        await supabase.from('prop_price_history').insert({
                          prop_id: dbProp.id,
                          price: outcome.point,
                          timestamp: now.toISOString(),
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
