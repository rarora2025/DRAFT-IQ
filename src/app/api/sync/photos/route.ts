import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    // 1. Fetch all players from DB
    const { data: players, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .is('photo_url', null);

    if (fetchError) throw fetchError;
    if (!players || players.length === 0) {
      return NextResponse.json({ success: true, message: 'No players to sync' });
    }

    let updatedCount = 0;

    // 2. Handle NFL Players (Sleeper API is great for this)
    const nflPlayers = players.filter(p => p.sport === 'NFL');
    if (nflPlayers.length > 0) {
      const sleeperRes = await fetch('https://api.sleeper.app/v1/players/nfl');
      const sleeperData = await sleeperRes.json();
      
      const sleeperPlayersList = Object.values(sleeperData) as any[];
      
      for (const player of nflPlayers) {
        if (!player.name) continue;
        const playerName = player.name;
        const match = sleeperPlayersList.find(sp => 
          sp.full_name?.toLowerCase() === playerName.toLowerCase() ||
          (sp.first_name?.toLowerCase() === playerName.split(' ')[0]?.toLowerCase() && 
           sp.last_name?.toLowerCase() === playerName.split(' ').slice(1).join(' ')?.toLowerCase())
        );

        if (match && match.player_id) {
          const photoUrl = `https://sleepercdn.com/content/nfl/players/${match.player_id}.jpg`;
          await supabase
            .from('players')
            .update({ photo_url: photoUrl })
            .eq('id', player.id);
          updatedCount++;
        }
      }
    }

    // 3. Handle NBA Players
    const nbaPlayers = players.filter(p => p.sport === 'NBA');
    if (nbaPlayers.length > 0) {
      // NBA stats API is finicky with headers, but let's try a common backup or pattern
      // Often, names match headshot URLs if you have the ID.
      // Let's try to get the ID map from a more open source if possible
      try {
        const nbaRes = await fetch('https://stats.nba.com/stats/commonallplayers?IsOnlyCurrentSeason=1&LeagueID=00&Season=2024-25', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.nba.com/'
          }
        });
        const nbaData = await nbaRes.json();
        const resultSet = nbaData.resultSets[0];
        const headers = resultSet.headers;
        const rowSet = resultSet.rowSet;

        const idIdx = headers.indexOf('PERSON_ID');
        const nameIdx = headers.indexOf('DISPLAY_FIRST_LAST');

          for (const player of nbaPlayers) {
            if (!player.name) continue;
            const playerName = player.name;
            const match = rowSet.find((row: any[]) => (row[nameIdx] || '').toLowerCase() === playerName.toLowerCase());

          if (match) {
            const playerId = match[idIdx];
            const photoUrl = `https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/${playerId}.png`;
            await supabase
              .from('players')
              .update({ photo_url: photoUrl })
              .eq('id', player.id);
            updatedCount++;
          }
        }
      } catch (err) {
        console.error('Error fetching NBA player IDs:', err);
        // Fallback: try search or just leave for now
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
