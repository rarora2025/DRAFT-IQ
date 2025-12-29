import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;

    // 1. Get the game from DB
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, external_id, status, game_time')
      .eq('external_id', gameId)
      .single();

    if (gameError || !game) {
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

              const formattedProps = props
                .filter((p: any) => p.player && p.player.name)
                .map((p: any) => ({
                  id: p.id,
                  player_name: p.player.name,
                  team: p.player.team,
                  sport: p.player.sport,
                  photo_url: p.player.photo_url,
                  prop_type: p.prop_type,
                  line: p.line,
                  current_value: p.current_value,
                  last_update: p.updated_at,
                  status: p.status
                }));



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
