import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, createClientServer } from '@/lib/supabase-server';
import { getGames, getEventOdds } from '@/lib/oddsApi';
import { logEvent } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  // Security check: Only allow Vercel Cron, local requests, or Admin users
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true';
  const isLocal = req.nextUrl.hostname === 'localhost';
  
  const cronSecret = process.env.CRON_SECRET;
  const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const supabaseServer = await createClientServer();
  const { data: { user } } = await supabaseServer.auth.getUser();
  
  const adminId = process.env.ADMIN_USER_ID || process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  const isAdmin = user?.id === adminId;

  if (!isVercelCron && !isLocal && !hasSecret && !isAdmin && process.env.NODE_ENV === 'production') {
    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'No active session found. Please log in.'
      }, { status: 401 });
    }
  }

    const supabase = getServiceRoleClient();
    const now = new Date();
      const nowMs = now.getTime();
      const fifteenSeconds = 15 * 1000;
      const oneMin = 60 * 1000;
      const fifteenMins = 15 * 60 * 1000;
      
      const current1mWindow = Math.floor(nowMs / oneMin);
      const current15mWindow = Math.floor(nowMs / fifteenMins);

    try {
      const { searchParams } = new URL(req.url);
      const specificGameId = searchParams.get('gameId');
      const force = searchParams.get('force') === 'true';
      
      console.log(`[Sync] Starting sync. SpecificGame: ${specificGameId}, Force: ${force}`);
      
      // 0a. GLOBAL SETTLEMENT SWEEP: Close any open positions in games already marked 'completed'
      try {
        const { data: openPositions, error: posError } = await supabase
          .from('positions')
          .select(`
            id, 
            player_prop_id, 
            player_props!inner (
              id,
              current_value,
              line,
              game_id,
              games!inner (
                status
              )
            )
          `)
          .is('closed_at', null);

        if (posError) throw posError;

        const strayPositions = openPositions?.filter((p: any) => p.player_props?.games?.status === 'completed') || [];

        if (strayPositions.length > 0) {
          console.log(`[Sync] Auto-closing ${strayPositions.length} positions in completed games`);
          // Use a Set to avoid settling the same market multiple times in one sweep
          const settledPropIds = new Set<string>();
          for (const pos of strayPositions) {
            if (settledPropIds.has(pos.player_prop_id)) continue;
            
            const prop = pos.player_props as any;
            const finalValue = prop.current_value ?? prop.line;
            await supabase.rpc('settle_market', {
              p_player_prop_id: pos.player_prop_id,
              p_final_value: finalValue
            });
            settledPropIds.add(pos.player_prop_id);
          }
        }
      } catch (sweepErr) {
        console.error('[Sync] Settlement sweep error:', sweepErr);
      }


      const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    // 0. Cleanup: Ensure future games are not 'live'
    const nowISO = now.toISOString();
    try {
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
        
        // 1. Determine if we should fetch fresh games list
        // Fetch last update time
        const { data: latestGameUpdate } = await supabase
          .from('games')
          .select('updated_at')
          .eq('sport', dbSport)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        const lastUpdate = latestGameUpdate ? new Date(latestGameUpdate.updated_at).getTime() : 0;

        // Check for live or starting soon games to determine refresh frequency
        const { data: activeOrSoonGames } = await supabase
          .from('games')
          .select('id')
          .eq('sport', dbSport)
          .or(`status.eq.live,and(status.eq.upcoming,game_time.lte.${new Date(nowMs + 10 * 60 * 1000).toISOString()})`);

        const hasActiveGames = activeOrSoonGames && activeOrSoonGames.length > 0;
        const gameRefreshInterval = hasActiveGames ? fifteenSeconds : fifteenMins;
        
        const lastWindowGames = Math.floor(lastUpdate / gameRefreshInterval);
        const shouldFetchGames = force || (Math.floor(nowMs / gameRefreshInterval) > lastWindowGames);

        let games = [];
      if (shouldFetchGames) {
        try {
          const freshGames = await getGames(sport);
          if (freshGames && freshGames.length > 0) {
            games = freshGames;
          } else {
            throw new Error('Empty response from API');
          }
        } catch (fetchErr) {
          console.error(`[Sync] Failed to fetch games for ${sport}:`, fetchErr);
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

        for (const game of games) {
          const gameTime = new Date(game.commence_time).getTime();
          const isOld = nowMs - gameTime > 6 * 60 * 60 * 1000;
          const isCompleted = game.completed || isOld;
          
          // Refined isLive: Must have REAL scores (not just empty list) or be past game time
          const hasRealScores = game.scores && game.scores.length > 0 && game.scores.some(s => parseInt(s.score) > 0);
          const isLive = (hasRealScores || nowMs >= gameTime) && !isCompleted;
          
          const homeScore = parseInt(game.scores?.find(s => s.name === game.home_team)?.score || '0');

        const awayScore = parseInt(game.scores?.find(s => s.name === game.away_team)?.score || '0');

        let dbGame = null;
        if (shouldFetchGames || specificGameId === game.id) {
          const { data: upsertedGame, error: gameError } = await supabase
            .from('games')
            .upsert({
              external_id: game.id,
              sport: dbSport,
              home_team: game.home_team,
              away_team: game.away_team,
              game_time: game.commence_time,
              status: isCompleted ? 'completed' : (isLive ? 'live' : 'upcoming'),
              home_score: homeScore,
              away_score: awayScore,
              updated_at: nowISO,
            }, { onConflict: 'external_id' })
            .select()
            .single();
          
          if (gameError) console.error('[Sync] Error upserting game:', gameError);
          dbGame = upsertedGame;
        } else {
          const { data: existingGame } = await supabase
            .from('games')
            .select('*')
            .eq('external_id', game.id)
            .single();
          dbGame = existingGame;
        }

        if (!dbGame) continue;

        if (isCompleted) {
          const { data: propsToSettle } = await supabase.rpc('get_props_needing_settlement', { 
            p_game_id: dbGame.id 
          });

          if (propsToSettle && propsToSettle.length > 0) {
            for (const prop of propsToSettle) {
              const finalValue = (prop.current_value !== null && prop.current_value !== undefined) 
                ? prop.current_value 
                : prop.line;
              
              await supabase.rpc('settle_market', {
                p_player_prop_id: prop.id,
                p_final_value: finalValue
              });
            }
          }
          continue;
        }

        // Tiered Prop Syncing
        const { data: propUpdate } = await supabase
          .from('player_props')
          .select('updated_at')
          .eq('game_id', dbGame.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
          const lastPropUpdate = propUpdate ? new Date(propUpdate.updated_at).getTime() : 0;
            const isPriority = specificGameId === game.id || activeGameIds.has(dbGame.id);
            
            // Use Math.floor to align with 1m and 15m windows
            const last1mWindow = Math.floor(lastPropUpdate / oneMin);
            const last15mWindow = Math.floor(lastPropUpdate / fifteenMins);
            
            const isNew1mWindow = current1mWindow > last1mWindow;
            const isNew15mWindow = current15mWindow > last15mWindow;

            // Live games should update more frequently to ensure the 1m point is fresh
            // but we still only save to history once per minute (rounded).
            const isLiveGame = isLive;
            const needsPropUpdate = (isLiveGame ? isNew1mWindow : isNew15mWindow);
            const isManualSync = specificGameId === game.id || (force && isPriority);
            
            // For live games, we allow updates every 15s even if it's the same 1m window,
            // this ensures the current minute's point is always the latest price.
            const shouldSyncLive = isLiveGame && (nowMs - lastPropUpdate >= fifteenSeconds);

            if (needsPropUpdate || isManualSync || shouldSyncLive) {
                // For history, we round to the START of the window.
                // For live games, this is the 1m window.
                const roundedTimeMs = (isLiveGame ? current1mWindow * oneMin : current15mWindow * fifteenMins);
                const roundedTimeISO = new Date(roundedTimeMs).toISOString();

                try {
              const { data: currentActiveProps } = await supabase
                .from('player_props')
                .select('id, external_id, status')
                .eq('game_id', dbGame.id)
                .in('status', ['LIVE', 'PRE_GAME', 'LOCKED']);
              
              const seenPropExternalIds = new Set<string>();
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
                        dbPlayer = existingPlayer;
                      }

                      if (!dbPlayer) continue;

                      const propExternalId = `${game.id}_${dbPlayer.id}_${market.key}`;
                      seenPropExternalIds.add(propExternalId);

                      const { data: existingProp } = await supabase
                        .from('player_props')
                        .select('id, line, current_value, status')
                        .eq('external_id', propExternalId)
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
                          external_id: propExternalId,
                          updated_at: nowISO,
                        }, { onConflict: 'external_id' })
                        .select()
                        .single();

                      if (propError || !dbProp) continue;
                      
                      if (existingProp && existingProp.current_value !== outcome.point) {
                        await logEvent('reference_updated', null, dbProp.id, {
                          old_value: existingProp.current_value,
                          new_value: outcome.point,
                          cause: 'market_sync'
                        });
                      }

                      const { data: lastHistory } = await supabase
                        .from('prop_price_history')
                        .select('price, timestamp')
                        .eq('prop_id', dbProp.id)
                        .order('timestamp', { ascending: false })
                        .limit(1)
                        .single();

                      // ALWAYS save a point if we are in a new window, even if price is same
                      // This ensures the graph shows a continuous line with points at every interval
                      await supabase.from('prop_price_history').upsert({
                        prop_id: dbProp.id,
                        price: outcome.point,
                        timestamp: roundedTimeISO,
                      }, { onConflict: 'prop_id, timestamp' });
                    }
                  }
                }
              }

                const missingProps = currentActiveProps?.filter(p => !seenPropExternalIds.has(p.external_id) && p.status !== 'LOCKED') || [];
                if (missingProps.length > 0) {
                  for (const prop of missingProps) {
                    // Fetch last known price to keep graph continuity
                    const { data: lastProp } = await supabase
                      .from('player_props')
                      .select('current_value, line')
                      .eq('id', prop.id)
                      .single();
                    
                    const lastPrice = lastProp?.current_value ?? lastProp?.line ?? null;

                      await supabase
                        .from('player_props')
                        .update({ 
                          status: 'LOCKED',
                          updated_at: nowISO
                        })
                        .eq('id', prop.id);
                    
                    await supabase.from('prop_price_history').upsert({
                      prop_id: prop.id,
                      price: lastPrice,
                      timestamp: roundedTimeISO,
                    }, { onConflict: 'prop_id, timestamp' });
                  }
                }
          } catch (oddsErr) {
            console.error(`[Sync] Error fetching odds for game ${game.id}:`, oddsErr);
          }
        }
      }
      allGames.push(...games);
    }

    // 2. FINAL SETTLEMENT SWEEP: Ensure any games marked 'completed' during the sync are settled immediately
    try {
      const { data: openPositions, error: posError } = await supabase
        .from('positions')
        .select(`
          id, 
          player_prop_id, 
          player_props!inner (
            id,
            current_value,
            line,
            game_id,
            games!inner (
              status
            )
          )
        `)
        .is('closed_at', null);

      if (!posError && openPositions && openPositions.length > 0) {
        const strayPositions = openPositions.filter((p: any) => p.player_props?.games?.status === 'completed');
        if (strayPositions.length > 0) {
          console.log(`[Sync] Final sweep auto-closing ${strayPositions.length} positions`);
          const settledPropIds = new Set<string>();
          for (const pos of strayPositions) {
            if (settledPropIds.has(pos.player_prop_id)) continue;
            const prop = pos.player_props as any;
            const finalValue = prop.current_value ?? prop.line;
            await supabase.rpc('settle_market', {
              p_player_prop_id: pos.player_prop_id,
              p_final_value: finalValue
            });
            settledPropIds.add(pos.player_prop_id);
          }
        }
      }
    } catch (finalSweepErr) {
      console.error('[Sync] Final settlement sweep error:', finalSweepErr);
    }

    return NextResponse.json({ success: true, gamesSynced: allGames.length });
  } catch (error: any) {
    console.error('[Sync] Critical error in sync route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
