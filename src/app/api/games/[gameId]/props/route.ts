import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const supabase = await createClient()

    // 1. Get the game from DB
    // Check if gameId is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId);
    
    let query = supabase
      .from('games')
      .select('id, external_id, status, game_time');
    
    if (isUuid) {
      query = query.or(`external_id.eq.${gameId},id.eq.${gameId}`);
    } else {
      query = query.eq('external_id', gameId);
    }

    const { data: game, error: gameError } = await query.maybeSingle();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Don't return props for old or completed games
    const now = new Date().getTime();
    const gameTime = new Date(game.game_time).getTime();
    if (game.status === 'completed' || now - gameTime > 6 * 60 * 60 * 1000) {
      return NextResponse.json({ props: [], status: 'completed' });
    }

    // 2. Get player props from DB
    const { data: props, error: propsError } = await supabase
      .from('player_props')
      .select(`
        id,
        line,
        current_value,
        prop_type,
        updated_at,
        status,
        player:players (
          id,
          name,
          team,
          sport,
          photo_url
        )
      `)
      .eq('game_id', game.id)
      .order('updated_at', { ascending: false });

    if (propsError) throw propsError;

      // 3. Get opening line for each prop (first history entry)
      const propIds = props.map(p => String(p.id));
      let historyMap: Record<string, number> = {};

      if (propIds.length > 0) {
        // Fetch first history entry for each prop individually to avoid row limit issues
        const historyPromises = propIds.map(async (propId) => {
          const { data } = await supabase
            .from('prop_price_history')
            .select('prop_id, price')
            .eq('prop_id', propId)
            .order('timestamp', { ascending: true })
            .limit(1)
            .single();
          return data;
        });
        
        const results = await Promise.all(historyPromises);
        results.forEach((h) => {
          if (h && h.prop_id && h.price !== undefined) {
            historyMap[h.prop_id] = h.price;
          }
        });
      }

    const formattedProps = props
      .filter((p: any) => p.player && p.player.name)
      .map((p: any) => {
        const propIdStr = String(p.id);
        const openingLine = historyMap[propIdStr] !== undefined ? historyMap[propIdStr] : p.line;

        return {
          id: p.id,
          player_name: p.player.name,
          team: p.player.team,
          sport: p.player.sport,
          photo_url: p.player.photo_url,
          prop_type: p.prop_type,
          line: p.line,
          opening_line: openingLine,
          current_value: p.current_value,
          last_update: p.updated_at,
          status: p.status
        };
      })
        .filter((p: any) => p.opening_line >= 1);

    return NextResponse.json(
      { 
        props: formattedProps,
        spreads: [],
        totals: []
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching props from DB:', error)
    return NextResponse.json(
      { error: 'Failed to fetch props' },
      { status: 500 }
    )
  }
}
