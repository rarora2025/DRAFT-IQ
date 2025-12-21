import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // Using anon key for simplicity if RLS is disabled as per policy
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPhotos() {
  try {
    console.log('Fetching players without photos...');
    const { data: players, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .is('photo_url', null);

    if (fetchError) throw fetchError;
    if (!players || players.length === 0) {
      console.log('No players to sync');
      return;
    }

    console.log(`Found ${players.length} players to sync.`);

    let updatedCount = 0;

    // 1. NFL Players (Sleeper)
    const nflPlayers = players.filter(p => p.sport === 'NFL');
    if (nflPlayers.length > 0) {
      console.log('Fetching NFL players from Sleeper...');
      const sleeperRes = await fetch('https://api.sleeper.app/v1/players/nfl');
      const sleeperData = await sleeperRes.json() as any;
      const sleeperPlayersList = Object.values(sleeperData);
      
      for (const player of nflPlayers) {
        const match = sleeperPlayersList.find((sp: any) => 
          sp.full_name?.toLowerCase() === player.name.toLowerCase() ||
          (sp.first_name?.toLowerCase() === player.name.split(' ')[0]?.toLowerCase() && 
           sp.last_name?.toLowerCase() === player.name.split(' ').slice(1).join(' ')?.toLowerCase())
        );

        if (match && (match as any).player_id) {
          const photoUrl = `https://sleepercdn.com/content/nfl/players/${(match as any).player_id}.jpg`;
          console.log(`Updating NFL player ${player.name} with photo: ${photoUrl}`);
          await supabase
            .from('players')
            .update({ photo_url: photoUrl })
            .eq('id', player.id);
          updatedCount++;
        }
      }
    }

    // 2. NBA Players
    const nbaPlayers = players.filter(p => p.sport === 'NBA');
    if (nbaPlayers.length > 0) {
      console.log('Fetching NBA players from secondary source...');
      try {
        const nbaRes = await fetch('https://raw.githubusercontent.com/bttmly/nba/master/data/players.json');
        const nbaData = await nbaRes.json() as any[];

        for (const player of nbaPlayers) {
          const match = nbaData.find((np: any) => 
            (np.firstName + ' ' + np.lastName).toLowerCase() === player.name.toLowerCase()
          );
          if (match) {
            const playerId = match.playerId;
            const photoUrl = `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${playerId}.png`;
            console.log(`Updating NBA player ${player.name} with photo: ${photoUrl}`);
            await supabase
              .from('players')
              .update({ photo_url: photoUrl })
              .eq('id', player.id);
            updatedCount++;
          }
        }
      } catch (err) {
        console.error('Error fetching NBA player IDs:', err);
      }
    }

    console.log(`Successfully synced ${updatedCount} player photos.`);
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

syncPhotos();
