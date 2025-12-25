import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase';
import { getGames, getEventOdds } from '@/lib/oddsApi';
import { logEvent } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  // Security check: Only allow Vercel Cron or local requests
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true';
  const isLocal = req.nextUrl.hostname === 'localhost';
  
  // You can set a CRON_SECRET in your env for extra security
  const cronSecret = process.env.CRON_SECRET;
  const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isLocal && !hasSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  try {
    const { searchParams } = new URL(req.url);
    const specificGameId = searchParams.get('gameId');
    const force = searchParams.get('force') === 'true';
    
    console.log(`[Sync] Starting sync. SpecificGame: ${specificGameId}, Force: ${force}`);
    
    const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    // 0. Mark stale props as FROZEN (older than 10 mins)
    const nowISO = new Date().toISOString();
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    try {
      // Cleanup: Ensure future games are not 'live' and their props are not 'LIVE'
      await supabase
        .from('games')
        .update({ status: 'upcoming' })
        .eq('status', 'live')
        .gt('game_time', nowISO);

      const { data: futureGames } = await supabase
        .from('games')
        .select('id')
        .gt('game_time', nowISO);
      
      if (futureGames && futureGames.length > 0) {
        await supabase
          .from('player_props')
          .update({ status: 'PRE_GAME' })
          .eq('status', 'LIVE')
          .in('game_id', futureGames.map(g => g.id));
      }
    } catch (cleanupErr) {
      console.error('[Sync] Cleanup error:', cleanupErr);
    }

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
        console.log(`[Sync] Processing sport: ${dbSport}`);
        
        // 1. Get current live games count for this sport in DB
        const { count: liveCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('sport', dbSport)
          .eq('status', 'live');

        // 2. Determine if we should fetch fresh games list (for scores and new games)
        // If live games exist, update every 2 mins. Otherwise, every 1 hour.
        const { data: latestGameUpdate } = await supabase
          .from('games')
          .select('updated_at')
          .eq('sport', dbSport)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        const lastUpdate = latestGameUpdate ? new Date(latestGameUpdate.updated_at).getTime() : 0;
        const discoveryInterval = (liveCount || 0) > 0 ? 2 * 60 * 1000 : 60 * 60 * 1000;
        const shouldFetchGames = force || (Date.now() - lastUpdate > discoveryInterval);

        let games = [];
        if (shouldFetchGames) {
          console.log(`[Sync] Fetching fresh games list for ${dbSport} (LiveCount: ${liveCount})`);
          try {
            games = await getGames(sport);
          } catch (fetchErr) {
            console.error(`[Sync] Failed to fetch games for ${sport}:`, fetchErr);
            // Fallback to DB
            const { data: dbGamesFallback } = await supabase.from('games').select('*').eq('sport', dbSport);
            games = (dbGamesFallback || []).map(g => ({
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
        } else {
          const { data: dbGames } = await supabase.from('games').select('*').eq('sport', dbSport);
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

        console.log(`[Sync] Processing ${games.length} games for ${dbSport}`);
        for (const game of games) {
          const gameTime = new Date(game.commence_time).getTime();
          const now = Date.now();
          const isOld = now - gameTime > 6 * 60 * 60 * 1000;
          const isCompleted = game.completed || isOld;
          const isLive = game.scores && game.scores.length > 0 && now >= gameTime;
          const startsSoon = gameTime - now > 0 && gameTime - now < 2 * 60 * 60 * 1000; // 2 hours
          
          // 3. Upsert Game
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

          if (gameError) console.error('[Sync] Error upserting game:', gameError);
          if (!dbGame) continue;

          // 4. If game is completed, settle all markets
          if (isCompleted) {
            const { data: props } = await supabase
              .from('player_props')
              .select('id, line, current_value')
              .eq('game_id', dbGame.id)
              .neq('status', 'SETTLED');

            if (props && props.length > 0) {
              console.log(`[Sync] Settling ${props.length} props for completed game ${dbGame.home_team} vs ${dbGame.away_team}`);
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

          // 5. Tiered Prop Syncing (High Priority Efficiency)
          const { data: propUpdate } = await supabase
            .from('player_props')
            .select('updated_at')
            .eq('game_id', dbGame.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
          
          const lastPropUpdate = propUpdate ? new Date(propUpdate.updated_at).getTime() : 0;
          const isPriority = specificGameId === game.id || activeGameIds.has(dbGame.id);
          
          let needsPropUpdate = force || isPriority;
          
          if (!needsPropUpdate) {
            if (isLive) {
              // Live games: Every 2 mins
              needsPropUpdate = (now - lastPropUpdate > 2 * 60 * 1000);
            } else if (startsSoon) {
              // Starting soon (< 2h): Every 15 mins
              needsPropUpdate = (now - lastPropUpdate > 15 * 60 * 1000);
            } else {
              // Routine upcoming: Every 4 hours
              needsPropUpdate = (now - lastPropUpdate > 4 * 60 * 60 * 1000);
            }
          }

          if (needsPropUpdate) {
          console.log(`[Sync] Updating props for ${dbGame.home_team} vs ${dbGame.away_team} (Priority: ${isPriority})`);
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

                      if (propError) console.error('[Sync] Error upserting prop:', propError);
                      
                      if (dbProp) {
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
            console.error(`[Sync] Error fetching odds for game ${game.id}:`, oddsErr);
          }
        }
      }
      allGames.push(...games);
    }

    console.log(`[Sync] Sync completed successfully. Total games processed: ${allGames.length}`);
    return NextResponse.json({ success: true, gamesSynced: allGames.length });
  } catch (error: any) {
    console.error('[Sync] Critical error in sync route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
