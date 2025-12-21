import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const NFL_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K'];

async function populatePlayers() {
  try {
    console.log('Starting player population...');

    // 1. Fetch NFL players from Sleeper
    let nflUpserts: any[] = [];
    try {
      console.log('Fetching NFL players from Sleeper...');
      const sleeperRes = await fetch('https://api.sleeper.app/v1/players/nfl');
      const sleeperData = await sleeperRes.json() as any;
      const allSleeperPlayers = Object.values(sleeperData);
      
      const activeNflPlayers = allSleeperPlayers.filter((p: any) => 
        p.active && 
        NFL_POSITIONS.includes(p.position) &&
        p.team // Must be on a team
      );

      console.log(`Found ${activeNflPlayers.length} active NFL players in key positions.`);

      nflUpserts = activeNflPlayers.map((p: any) => ({
        name: p.full_name,
        team: p.team,
        sport: 'NFL',
        position: p.position,
        jersey_number: p.number?.toString(),
        external_id: `nfl_${p.player_id}`,
        photo_url: `https://sleepercdn.com/content/nfl/players/${p.player_id}.jpg`
      }));
    } catch (err) {
      console.error('NFL Fetch failed:', err);
    }

    // 2. Fetch NBA players from a more comprehensive source
    let nbaUpserts: any[] = [];
    try {
      console.log('Fetching NBA players from BasketBall-GM Rosters...');
      const nbaRes = await fetch('https://raw.githubusercontent.com/alexnoob/BasketBall-GM-Rosters/master/2024-25.NBA.Roster.json');
      if (!nbaRes.ok) throw new Error(`Failed to fetch NBA roster: ${nbaRes.statusText}`);
      
      const text = await nbaRes.text();
      let nbaFullData;
      try {
        nbaFullData = JSON.parse(text);
      } catch (e) {
        // Fallback for JS object literal format
        nbaFullData = (new Function(`return ${text}`))();
      }

      const nbaPlayers = nbaFullData.players || [];
      const nbaTeams = nbaFullData.teams || [];
      
      const nbaTeamMap = new Map();
      nbaTeams.forEach((t: any) => {
        nbaTeamMap.set(t.tid, `${t.region} ${t.name}`);
      });

      console.log(`Found ${nbaPlayers.length} NBA players in source.`);

      nbaUpserts = nbaPlayers
        .filter((p: any) => p.name)
        .map((p: any) => {
          const latestStats = p.stats?.[p.stats.length - 1];
          return {
            name: p.name,
            team: nbaTeamMap.get(p.tid) || 'Unknown',
            sport: 'NBA',
            position: p.pos,
            jersey_number: latestStats?.jerseyNumber || null,
            external_id: `nba_${p.pid || p.name.replace(/\s+/g, '_').toLowerCase()}`,
            photo_url: p.imgURL || `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${p.pid}.png`
          };
        });
    } catch (err) {
      console.error('NBA Fetch failed:', err);
    }

    const allUpserts = [...nflUpserts, ...nbaUpserts];
    console.log(`Total players to upsert: ${allUpserts.length}`);

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < allUpserts.length; i += batchSize) {
      const batch = allUpserts.slice(i, i + batchSize);
      const { error } = await supabase
        .from('players')
        .upsert(batch, { onConflict: 'name,sport' });

      if (error) {
        console.error(`Error upserting batch ${i / batchSize}:`, error);
      } else {
        console.log(`Upserted batch ${i / batchSize + 1}/${Math.ceil(allUpserts.length / batchSize)}`);
      }
    }

    console.log('Player population completed!');
  } catch (error) {
    console.error('Population failed:', error);
  }
}

populatePlayers();
