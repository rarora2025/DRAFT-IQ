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
      .select('id, external_id')
      .eq('external_id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Get player props from DB
    const { data: props, error: propsError } = await supabase
      .from('player_props')
      .select(`
        id,
        line,
        prop_type,
        updated_at,
        player:players (
          id,
          name,
          team,
          sport
        )
      `)
      .eq('game_id', game.id);

    if (propsError) throw propsError;

    const formattedProps = props.map((p: any) => ({
      id: p.id,
      player_name: p.player.name,
      team: p.player.team,
      prop_type: p.prop_type,
      line: p.line,
      last_update: p.updated_at
    }));

    return NextResponse.json({ 
      props: formattedProps,
      spreads: [], // Removed as requested
      totals: []   // Removed as requested
    });
  } catch (error) {
    console.error('Error fetching props from DB:', error)
    return NextResponse.json(
      { error: 'Failed to fetch props' },
      { status: 500 }
    )
  }
}
