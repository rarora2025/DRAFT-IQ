import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3c3ppbnlwcWpyZWJ0cHJvdnVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwMjUzNSwiZXhwIjoyMDgwODc4NTM1fQ.wpERCtXmHCEPRZe6ZXm1nDR4iTsQSvQG84dMGY9p_L0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
  console.log('Cleaning up test data...');

  // 1. Delete Auth Users (this should cascade to profiles if set up, or we delete profiles later)
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Error listing users:', listErr);
  } else {
    const testUsers = users.filter(u => u.email?.startsWith('test_'));
    console.log(`Found ${testUsers.length} test users.`);
    for (const user of testUsers) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) console.error(`Error deleting user ${user.id}:`, delErr);
      else console.log(`Deleted user ${user.id} (${user.email})`);
    }
  }

  // 2. Delete database records (order matters for FKs)
  
  // Positions
  const { error: posErr } = await supabase.from('positions').delete().or('market_title.eq.T,market_title.eq.Test');
  console.log('Deleted positions:', posErr ? posErr.message : 'Success');

  // Player Props
  const { error: propErr } = await supabase.from('player_props').delete()
    .or('external_id.ilike.m1_%,external_id.ilike.m2_%,external_id.ilike.m3_%,external_id.ilike.test_prop_%');
  console.log('Deleted player props:', propErr ? propErr.message : 'Success');

  // Players
  const { error: playerErr } = await supabase.from('players').delete()
    .or('external_id.ilike.p1_%,external_id.ilike.p2_%,external_id.ilike.p3_%,external_id.ilike.test_player_%');
  console.log('Deleted players:', playerErr ? playerErr.message : 'Success');

  // Games
  const { error: gameErr } = await supabase.from('games').delete()
    .or('external_id.ilike.g1_%,external_id.ilike.g2_%,external_id.ilike.g3_%,external_id.ilike.test_game_%');
  console.log('Deleted games:', gameErr ? gameErr.message : 'Success');

  console.log('Cleanup complete.');
}

cleanup();
