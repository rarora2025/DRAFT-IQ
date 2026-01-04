import { NextRequest, NextResponse } from 'next/server'
import { createClient, getServiceRoleClient } from '@/lib/supabase-server'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

export async function GET() {
  try {
    const supabase = getServiceRoleClient()
    
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select(`
        *,
        daily_windows:contest_daily_windows(*)
      `)
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    if (contestError) throw contestError

    const { data: dailyWinners } = await supabase
      .from('contest_daily_winners')
      .select(`
        *,
        profiles:user_id(username)
      `)
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    const { count: participantCount } = await supabase
      .from('contest_participants')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    return NextResponse.json({
      contest: {
        ...contest,
        participant_count: participantCount || 0,
        daily_winners: dailyWinners || []
      }
    })
  } catch (error) {
    console.error('Error fetching contest:', error)
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = getServiceRoleClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    let userId = user?.id
    
    if (!userId) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: tokenUser } = await serviceSupabase.auth.getUser(token)
        userId = tokenUser?.user?.id
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existingParticipant } = await serviceSupabase
      .from('contest_participants')
      .select('id')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('user_id', userId)
      .single()

    if (existingParticipant) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already enrolled',
        participant_id: existingParticipant.id
      })
    }

    const { data: contest } = await serviceSupabase
      .from('contests')
      .select('status, initial_balance')
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    if (!contest || contest.status !== 'live') {
      return NextResponse.json({ error: 'Contest is not active' }, { status: 400 })
    }

    const { data: participant, error: insertError } = await serviceSupabase
      .from('contest_participants')
      .insert({
        contest_id: NFL_PLAYOFF_CONTEST_ID,
        user_id: userId,
        initial_balance: contest.initial_balance,
        current_balance: contest.initial_balance
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the NFL Playoff Challenge!',
      participant
    })
  } catch (error) {
    console.error('Error joining contest:', error)
    return NextResponse.json({ error: 'Failed to join contest' }, { status: 500 })
  }
}
