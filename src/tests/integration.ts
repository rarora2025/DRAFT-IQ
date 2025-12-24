import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3c3ppbnlwcWpyZWJ0cHJvdnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwMjUzNSwiZXhwIjoyMDgwODc4NTM1fQ.wpERCtXmHCEPRZe6ZXm1nDR4iTsQSvQG84dMGY9p_L0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser(runId: string) {
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: `test_${runId}_${Math.random().toString(36).substring(7)}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  if (authErr) throw authErr;

  const userId = authUser.user.id;
  
  // Try to update first (trigger might have created it)
  let { data: profile, error: pErr } = await supabase
    .from('profiles')
    .update({ balance: 1000, username: `u_${runId}_${Math.random().toString(36).substring(7)}` })
    .eq('id', userId)
    .select()
    .single();
  
  if (pErr || !profile) {
    const { data: newProfile, error: iErr } = await supabase
      .from('profiles')
      .upsert({ id: userId, balance: 1000, username: `u_${runId}`, email: authUser.user.email })
      .select()
      .single();
    if (iErr) throw iErr;
    return newProfile;
  }
  
  return profile;
}

async function test1() {
  console.log('\n--- Test 1: Market settles with ZERO users online ---');
  const runId = Date.now().toString();
  
  const { data: game, error: gErr } = await supabase.from('games').insert({ sport: 'NBA', home_team: 'H1', away_team: 'A1', game_time: new Date().toISOString(), status: 'live', external_id: `g1_${runId}` }).select().single();
  if (gErr) throw gErr;
  
  const { data: player, error: pErr } = await supabase.from('players').insert({ name: `P1_${runId}`, sport: 'NBA', external_id: `p1_${runId}` }).select().single();
  if (pErr) throw pErr;
  
  const { data: market, error: mErr } = await supabase.from('player_props').insert({ game_id: game!.id, player_id: player!.id, prop_type: 'pts', line: 20.5, status: 'LIVE', external_id: `m1_${runId}` }).select().single();
  if (mErr) throw mErr;

    const user = await createTestUser(runId);

    // Deduct balance for trade
    await supabase.from('profiles').update({ balance: 900 }).eq('id', user.id);

    const { error: posErr } = await supabase.from('positions').insert({ 
      user_id: user.id, 
      player_prop_id: market!.id, 
      side: 'long', 
      size: 100, 
      quantity: 10, 
      entry_price: 10, 
      entry_reference_value: 20.5, 
      market_title: 'T' 
    });
    if (posErr) throw posErr;

    await supabase.from('games').update({ status: 'completed' }).eq('id', game!.id);
    const { data: settleResult, error: sErr } = await supabase.rpc('settle_market', { p_player_prop_id: market!.id, p_final_value: 25.5 });
    if (sErr) throw sErr;
    console.log('Settlement result:', settleResult);

    const { data: upPos, error: upPosErr } = await supabase.from('positions').select('*').eq('user_id', user.id).single();
    if (upPosErr) throw upPosErr;
    
    const { data: upUser, error: upUserErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (upUserErr) throw upUserErr;

    console.log('Status:', upPos.closed_at ? 'CLOSED' : 'OPEN', 'PnL:', upPos.realized_pnl, 'Balance:', upUser.balance);
    if (upPos.closed_at && Number(upUser.balance) > 1000) console.log('✅ Test 1 Passed');
    else console.error('❌ Test 1 Failed');
  }

  async function test2() {
    console.log('\n--- Test 2: App downtime during settlement ---');
    const runId = (Date.now() + 1).toString();
    const { data: game } = await supabase.from('games').insert({ sport: 'NBA', home_team: 'H2', away_team: 'A2', game_time: new Date().toISOString(), status: 'live', external_id: `g2_${runId}` }).select().single();
    const { data: player } = await supabase.from('players').insert({ name: `P2_${runId}`, sport: 'NBA', external_id: `p2_${runId}` }).select().single();
    const { data: market } = await supabase.from('player_props').insert({ game_id: game!.id, player_id: player!.id, prop_type: 'pts', line: 10, status: 'LIVE', external_id: `m2_${runId}` }).select().single();
    const user = await createTestUser(runId);
    
    await supabase.from('profiles').update({ balance: 900 }).eq('id', user.id);
    await supabase.from('positions').insert({ user_id: user.id, player_prop_id: market!.id, side: 'long', size: 100, quantity: 10, entry_price: 10, entry_reference_value: 10, market_title: 'T' });

    await supabase.from('player_props').update({ status: 'FROZEN', final_reference_value: 15 }).eq('id', market!.id);
    await supabase.rpc('settle_market', { p_player_prop_id: market!.id, p_final_value: 15 });
    await supabase.rpc('settle_market', { p_player_prop_id: market!.id, p_final_value: 15 });

    const { data: finalM } = await supabase.from('player_props').select('status').eq('id', market!.id).single();
    if (finalM.status === 'SETTLED') console.log('✅ Test 2 Passed');
    else console.error('❌ Test 2 Failed');
  }

  async function test3() {
    console.log('\n--- Test 3: Multiple users, same market ---');
    const runId = (Date.now() + 2).toString();
    const { data: game } = await supabase.from('games').insert({ sport: 'NBA', home_team: 'H3', away_team: 'A3', game_time: new Date().toISOString(), status: 'live', external_id: `g3_${runId}` }).select().single();
    const { data: player } = await supabase.from('players').insert({ name: `P3_${runId}`, sport: 'NBA', external_id: `p3_${runId}` }).select().single();
    const { data: market } = await supabase.from('player_props').insert({ game_id: game!.id, player_id: player!.id, prop_type: 'pts', line: 10, status: 'LIVE', external_id: `m3_${runId}` }).select().single();
    
    const userA = await createTestUser(runId + 'A');
    const userB = await createTestUser(runId + 'B');

    await supabase.from('profiles').update({ balance: 900 }).eq('id', userA.id);
    await supabase.from('profiles').update({ balance: 900 }).eq('id', userB.id);

    await supabase.from('positions').insert([
      { user_id: userA.id, player_prop_id: market!.id, side: 'long', size: 100, quantity: 10, entry_price: 10, entry_reference_value: 10, market_title: 'T' },
      { user_id: userB.id, player_prop_id: market!.id, side: 'short', size: 100, quantity: 10, entry_price: 10, entry_reference_value: 10, market_title: 'T' }
    ]);

  await supabase.rpc('settle_market', { p_player_prop_id: market!.id, p_final_value: 15 });
  const { data: fA } = await supabase.from('profiles').select('balance').eq('id', userA.id).single();
  const { data: fB } = await supabase.from('profiles').select('balance').eq('id', userB.id).single();

  console.log('A:', fA.balance, 'B:', fB.balance);
  if (Number(fA.balance) > 1000 && Number(fB.balance) < 1000) console.log('✅ Test 3 Passed');
  else console.error('❌ Test 3 Failed');
}

async function run() {
  try {
    await test1();
    await test2();
    await test3();
  } catch (err) {
    console.error('Error in tests:', err);
  }
}
run();
