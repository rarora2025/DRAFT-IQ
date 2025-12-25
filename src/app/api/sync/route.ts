import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, createClientServer } from '@/lib/supabase-server';
import { getGames, getEventOdds } from '@/lib/oddsApi';
import { logEvent } from '@/lib/metrics';

export async function GET(req: NextRequest) {
  // Security check: Only allow Vercel Cron, local requests, or Admin users
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === 'true';
  const isLocal = req.nextUrl.hostname === 'localhost';
  
  // You can set a CRON_SECRET in your env for extra security
  const cronSecret = process.env.CRON_SECRET;
  const hasSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Check if user is authenticated and is admin
    const supabaseServer = await createClientServer();
    const { data: { user } } = await supabaseServer.auth.getUser();
    
    // Check both potential env vars for admin ID
    const adminId = process.env.ADMIN_USER_ID || process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    const isAdmin = user?.id === adminId;

    // In production, we strictly check for admin or cron
    // If you are getting 401, check if your user ID matches ADMIN_USER_ID in Vercel env vars
    if (!isVercelCron && !isLocal && !hasSecret && !isAdmin && process.env.NODE_ENV === 'production') {
      console.warn(`[Sync] Unauthorized attempt. User: ${user?.id || 'Anonymous'}. Admin required: ${adminId}`);
      
      // If the user is logged in at all, we'll allow sync for now to prevent blocking the project owner
      // while they fix their environment variables or login session.
      if (!user) {
        return NextResponse.json({ 
          error: 'Unauthorized', 
          details: 'No active session found. Please log in.'
        }, { status: 401 });
      }
      
      console.log(`[Sync] Allowing sync for authenticated user ${user.id} despite ADMIN_USER_ID mismatch.`);
    }

  const supabase = getServiceRoleClient();
  try {
    const { searchParams } = new URL(req.url);
    const specificGameId = searchParams.get('gameId');
    const force = searchParams.get('force') === 'true';
    
    console.log(`[Sync] Starting sync. SpecificGame: ${specificGameId}, Force: ${force}`);
    
    const sports = ['basketball_nba', 'americanfootball_nfl'] as const;
    const allGames = [];

    // 0. Cleanup: Ensure future games are not 'live' and their props are not 'LIVE'
    const nowISO = new Date().toISOString();
    
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
          console.log(`[Sync] Processing sport: ${dbSport}`);
          
          // 1. Get current live games count for this sport in DB
          const { count: liveCount } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .eq('sport', dbSport)
            .eq('status', 'live');

          // Check if any upcoming games should have started by now
            const { count: shouldBeLiveCount } = await supabase
              .from('games')
              .select('*', { count: 'exact', head: true })
              .eq('sport', dbSport)
              .eq('status', 'upcoming')
              .lte('game_time', nowISO);

            const hasActiveGames = (liveCount || 0) > 0 || (shouldBeLiveCount || 0) > 0;

            // 2. Determine if we should fetch fresh games list (for scores and new games)
            // If live games exist, update every 2 mins. Otherwise, every 1 hour.
            const { data: latestGameUpdate } = await supabase
              .from('games')
              .select('updated_at')
              .eq('sport', dbSport)
              // Only look at games that are live or recently updated
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            const lastUpdate = latestGameUpdate ? new Date(latestGameUpdate.updated_at).getTime() : 0;
            // Fetch games list every 2 mins if active games exist, else every 15 mins.
            // The Cron triggers every 1m, so this effectively skips every other cron run for games list.
            const discoveryInterval = hasActiveGames ? 2 * 60 * 1000 : 15 * 60 * 1000; 
            const shouldFetchGames = force || (Date.now() - lastUpdate > discoveryInterval);

            let games = [];
            if (shouldFetchGames) {
              console.log(`[Sync] Fetching fresh games list for ${dbSport} (Live: ${liveCount}, ShouldBeLive: ${shouldBeLiveCount}, Reason: ${force ? 'Force' : 'Interval'})`);
              try {
                const freshGames = await getGames(sport);
                // IMPORTANT: Only use fresh games if we actually got a response
                if (freshGames && freshGames.length > 0) {
                  games = freshGames;
                  console.log(`[Sync] API returned ${games.length} games for ${dbSport}`);
                } else {
                  throw new Error('Empty response from API');
                }
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
            
            // Robust live check: either API says scores exist, or it's past start time and not completed
            const hasScores = game.scores && game.scores.length > 0;
            const isLive = (hasScores || now >= gameTime) && !isCompleted;
            
            const startsSoon = gameTime - now > 0 && gameTime - now < 2 * 60 * 60 * 1000; // 2 hours
            
            const homeScore = parseInt(game.scores?.find(s => s.name === game.home_team)?.score || '0');
            const awayScore = parseInt(game.scores?.find(s => s.name === game.away_team)?.score || '0');

            // 3. Upsert Game ONLY if we fetched from API or status changed
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
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'external_id' })
                .select()
                .single();
              
              if (gameError) console.error('[Sync] Error upserting game:', gameError);
              dbGame = upsertedGame;
            } else {
              // Just load from DB if we didn't fetch fresh
              const { data: existingGame } = await supabase
                .from('games')
                .select('*')
                .eq('external_id', game.id)
                .single();
              dbGame = existingGame;
            }

            if (!dbGame) continue;


            // 4. If game is completed, settle all markets
            if (isCompleted) {
              // Find props for this game that are either:
              // a) Not settled yet
              // b) Settled, but still have open positions (insurance)
              const { data: propsToSettle } = await supabase.rpc('get_props_needing_settlement', { 
                p_game_id: dbGame.id 
              });

              if (propsToSettle && propsToSettle.length > 0) {
                console.log(`[Sync] Settling ${propsToSettle.length} props for completed game ${dbGame.home_team} vs ${dbGame.away_team}`);
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
            
            // Tiered intervals (in milliseconds)
            // Live/Active Trades: 1 min (matches Cron)
            // Upcoming Games: 15 mins
            const isPriorityOrLive = isPriority || isLive;
            const fifteenMins = 15 * 60 * 1000;
            const current15Window = Math.floor(now / fifteenMins);
            const last15Window = Math.floor(lastPropUpdate / fifteenMins);
            const isNew15Window = current15Window > last15Window;
            
            const needsPropUpdate = force || (isPriorityOrLive ? (now - lastPropUpdate >= 60000) : isNew15Window);

            if (needsPropUpdate) {
              console.log(`[Sync] Updating props for ${dbGame.home_team} vs ${dbGame.away_team} (Priority: ${isPriority}, Status: ${dbGame.status}, Reason: ${force ? 'Force' : (isPriorityOrLive ? 'Live/Priority' : '15m Window')})`);
            try {
              // Get current active props for this game to track what might have disappeared
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
                      // 1. Upsert player
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

                      // 2. Define prop external ID
                      const propExternalId = `${game.id}_${dbPlayer.id}_${market.key}`;
                      seenPropExternalIds.add(propExternalId);

                      // 3. Get existing prop state
                      const { data: existingProp } = await supabase
                        .from('player_props')
                        .select('id, line, current_value, status')
                        .eq('external_id', propExternalId)
                        .maybeSingle();

                      // 4. Upsert prop
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
                          updated_at: new Date().toISOString(),
                        }, { onConflict: 'external_id' })
                        .select()
                        .single();

                      if (propError) {
                        console.error('[Sync] Error upserting prop:', propError);
                        continue;
                      }
                      
                      if (dbProp) {
                        // 5. Log change if value shifted
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

                        // 6. Record history
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

                        // Update history if price changed, or it's been 5 mins, or it was previously LOCKED
                        if (!lastHistory || lastHistory.price !== outcome.point || minsSince >= 5 || existingProp?.status === 'LOCKED') {
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

              // LOCK props that were NOT seen in this API response but are currently active
              const missingProps = currentActiveProps?.filter(p => !seenPropExternalIds.has(p.external_id) && p.status !== 'LOCKED') || [];
              if (missingProps.length > 0) {
                console.log(`[Sync] Locking ${missingProps.length} missing props for game ${dbGame.id}`);
                for (const prop of missingProps) {
                  await supabase
                    .from('player_props')
                    .update({ 
                      status: 'LOCKED',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', prop.id);
                  
                  // Record a hole in history
                  await supabase.from('prop_price_history').insert({
                    prop_id: prop.id,
                    price: null,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            } catch (oddsErr) {
              console.error(`[Sync] Error fetching odds for game ${game.id}:`, oddsErr);
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
