import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { propId: string } }
) {
  const { propId } = await params

  try {
    const { data: prop, error } = await supabase
      .from('player_props')
      .select('*, players(*)')
      .eq('id', propId)
      .single()

    if (error) throw error

    return NextResponse.json({ prop })
  } catch (error) {
    console.error('Error fetching prop:', error)
    return NextResponse.json({ error: 'Failed to fetch prop' }, { status: 500 })
  }
}
