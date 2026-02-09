import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const INITIAL_BALANCE = 1000
const FROZEN_FILE = join(process.cwd(), 'data', 'frozen-leaderboard.json')
// Super Bowl ended Feb 8 2026 - contest is frozen after this date
const CONTEST_END_DATE = new Date('2026-02-09T06:00:00Z') // Feb 9 1AM EST = post-game

export async function GET(request: Request) {
  try {
    const supabase = getServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const selectedWindowId = searchParams.get('windowId')
    
    // Check contest status first
    const { data: contestRow } = await supabase
      .from('contests')
      .select('status, active_window_override_id')
      .eq('id', NFL_PLAYOFF_CONTEST_ID)
      .single()

    const isCompleted = contestRow?.status === 'completed' || new Date() >= CONTEST_END_DATE

    // If contest is completed and frozen file exists, return frozen data (fast path)
    if (isCompleted && existsSync(FROZEN_FILE)) {
      try {
        const frozenData = JSON.parse(readFileSync(FROZEN_FILE, 'utf-8'))
        return NextResponse.json({
          ...frozenData,
          frozen: true,
          timestamp: new Date().toISOString()
        })
      } catch (e) {
        console.error('Error reading frozen leaderboard:', e)
        // Fall through to live calculation
      }
    }

    const { data: participants, error: participantsError } = await supabase
      .from('contest_participants')
      .select('id, user_id, initial_balance, joined_at')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    if (participantsError) throw participantsError

    const userIds = (participants || []).map(p => p.user_id)
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, balance')
      .in('id', userIds.length > 0 ? userIds : ['none'])
    
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const now = new Date()
    
    // Calculate start of today in EST (12:00 AM EST)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const estDateOnly = formatter.format(now) // YYYY-MM-DD
    const systemWindowName = `[SYSTEM] Daily: ${estDateOnly}`

    // Calculate UTC offset for EST/EDT to get exact 12:00 AM EST
    const tempDate = new Date()
    const estDateFull = new Date(tempDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const utcDateFull = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }))
    const offsetMs = utcDateFull.getTime() - estDateFull.getTime()
    
    const startOfESTInUTC = new Date(new Date(`${estDateOnly}T00:00:00`).getTime() + offsetMs)
    const endOfESTInUTC = new Date(new Date(`${estDateOnly}T23:59:59.999`).getTime() + offsetMs)
    
    // Get or create the system window for today's reset
    let { data: systemWindow } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('name', systemWindowName)
      .maybeSingle()

    if (!systemWindow) {
      const { data: newWindow, error: windowError } = await supabase
        .from('contest_daily_windows')
        .insert({
          contest_id: NFL_PLAYOFF_CONTEST_ID,
          name: systemWindowName,
          start_time: startOfESTInUTC.toISOString(),
          end_time: endOfESTInUTC.toISOString(),
          is_locked: false
        })
        .select()
        .single()
      
      if (!windowError) {
        systemWindow = newWindow
      }
    }

    const { data: currentWindow } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .not('name', 'ilike', '[SYSTEM]%')
      .lte('start_time', now.toISOString())
      .gte('end_time', now.toISOString())
      .single()

    const { data: latestWindow } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .not('name', 'ilike', '[SYSTEM]%')
      .lte('start_time', now.toISOString())
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle()

        // Determine window for "Today" leaderboard
        const windowToUse = selectedWindowId 
          ? (await supabase.from('contest_daily_windows').select('*').eq('id', selectedWindowId).single()).data
          : (contestRow?.active_window_override_id 
              ? (contestRow.active_window_override_id === 'none' 
                  ? null 
                  : (await supabase.from('contest_daily_windows').select('*').eq('id', contestRow.active_window_override_id).single()).data)
              : (currentWindow)) // Fallback only to scheduled window, not latest or system.


      // Fetch snapshots for both the system daily window and the "Today" window
      const { data: snapshots } = await supabase
        .from('contest_daily_snapshots')
        .select('*')
        .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
        .in('daily_window_id', [systemWindow?.id || '', windowToUse?.id || ''].filter(Boolean))

      const leaderboard = await Promise.all(
        (participants || []).map(async (participant) => {
          const profile = profileMap.get(participant.user_id)
          
          // Get current value (same logic as before)
          const { data: positions } = await supabase
            .from('positions')
            .select('id, side, quantity, entry_price, player_prop_id')
            .eq('user_id', participant.user_id)
            .is('closed_at', null)

          let positionsValue = 0
          if (positions && positions.length > 0) {
            const propIds = positions.map(p => p.player_prop_id).filter(Boolean)
            const { data: props } = propIds.length > 0 ? await supabase
              .from('player_props')
              .select('id, current_value, line')
              .in('id', propIds) : { data: [] }
            
            const propMap = new Map((props || []).map(p => [p.id, p]))
            
            for (const pos of positions) {
              const pp = propMap.get(pos.player_prop_id)
              const currentPrice = pp?.current_value || pp?.line || pos.entry_price || 0
              if (pos.side === 'long') {
                positionsValue += Number(pos.quantity) * Number(currentPrice)
              } else if (pos.side === 'short') {
                positionsValue += Number(pos.quantity) * (2 * Number(pos.entry_price) - Number(currentPrice))
              }
            }
          }

          const cashBalance = Number(profile?.balance || 0)
          const totalValue = cashBalance + positionsValue
          const initialBalance = Number(participant.initial_balance) || INITIAL_BALANCE
          const totalReturn = initialBalance > 0 
            ? ((totalValue - initialBalance) / initialBalance) * 100 
            : 0

          // Calculate Daily Return (Always from 12:00 AM EST)
          let systemSnapshot = snapshots?.find(s => s.user_id === participant.user_id && s.daily_window_id === systemWindow?.id)
          if (!systemSnapshot && systemWindow) {
            const { data: newSnapshot } = await supabase
              .from('contest_daily_snapshots')
              .insert({
                contest_id: NFL_PLAYOFF_CONTEST_ID,
                daily_window_id: systemWindow.id,
                user_id: participant.user_id,
                start_value: totalValue
              })
              .select()
              .single()
            systemSnapshot = newSnapshot
          }

          const dailyStartValue = systemSnapshot ? Number(systemSnapshot.start_value) : totalValue
          const dailyReturn = dailyStartValue > 0 ? ((totalValue - dailyStartValue) / dailyStartValue) * 100 : 0

          // Calculate Window Return (For Today tab ranking)
          let windowSnapshot = snapshots?.find(s => s.user_id === participant.user_id && s.daily_window_id === windowToUse?.id)
          
          // Determine if this is a "current" window that should use today's baseline
          const isTodayWindow = windowToUse?.id === systemWindow?.id || 
                                 windowToUse?.id === contestRow?.active_window_override_id ||
                                 windowToUse?.id === currentWindow?.id

          if (!windowSnapshot && windowToUse && windowToUse.id !== systemWindow?.id) {
            const { data: newSnapshot } = await supabase
              .from('contest_daily_snapshots')
              .insert({
                contest_id: NFL_PLAYOFF_CONTEST_ID,
                daily_window_id: windowToUse.id,
                user_id: participant.user_id,
                start_value: isTodayWindow ? dailyStartValue : totalValue
              })
              .select()
              .single()
            windowSnapshot = newSnapshot
          }

          const windowStartValue = isTodayWindow 
            ? dailyStartValue 
            : (windowSnapshot ? Number(windowSnapshot.start_value) : totalValue)
          const windowReturn = windowStartValue > 0 ? ((totalValue - windowStartValue) / windowStartValue) * 100 : 0

          return {
            id: participant.id,
            user_id: participant.user_id,
            username: profile?.username || 'Unknown',
            portfolio_value: totalValue,
            total_return: totalReturn,
            daily_return: dailyReturn, // For subtitles (12:00 AM EST)
            window_return: windowReturn, // For Today rankings
            joined_at: participant.joined_at
          }
        })
      )

      // STABLE SORTING
      const overallLeaderboard = [...leaderboard].sort((a, b) => {
        if (Math.abs(b.portfolio_value - a.portfolio_value) > 0.001) {
          return b.portfolio_value - a.portfolio_value
        }
        return a.username.localeCompare(b.username)
      })

      const dailyLeaderboard = [...leaderboard].sort((a, b) => {
        if (Math.abs(b.window_return - a.window_return) > 0.001) {
          return b.window_return - a.window_return
        }
        return a.username.localeCompare(b.username)
      })

    const { data: dailyWindows } = await supabase
      .from('contest_daily_windows')
      .select('*')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .not('name', 'ilike', '[SYSTEM]%') // Filter out system windows
      .order('start_time', { ascending: true })

    const { data: dailyWinnersRaw } = await supabase
      .from('contest_daily_winners')
      .select('id, user_id, daily_return, portfolio_value, daily_window_id')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)

    const winnerUserIds = (dailyWinnersRaw || []).map(w => w.user_id)
    const { data: winnerProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', winnerUserIds.length > 0 ? winnerUserIds : ['none'])
    
    const winnerProfileMap = new Map((winnerProfiles || []).map(p => [p.id, p]))
    const windowMap = new Map((dailyWindows || []).map(w => [w.id, w]))

    const dailyWinners = (dailyWinnersRaw || []).map(w => ({
      ...w,
      profiles: winnerProfileMap.get(w.user_id),
      daily_window: windowMap.get(w.daily_window_id)
    }))

    const responseData = {
      overall: overallLeaderboard,
      today: dailyLeaderboard,
      current_window: currentWindow,
      active_window_id: windowToUse?.id,
      daily_windows: dailyWindows,
      daily_winners: dailyWinners,
      frozen: false,
      timestamp: new Date().toISOString()
    }

    // If contest is completed, auto-freeze by writing the snapshot file
    if (isCompleted && !existsSync(FROZEN_FILE)) {
      try {
        const { mkdirSync, writeFileSync } = require('fs')
        const dir = join(process.cwd(), 'data')
        mkdirSync(dir, { recursive: true })
        writeFileSync(FROZEN_FILE, JSON.stringify({
          overall: overallLeaderboard,
          today: overallLeaderboard,
          current_window: null,
          active_window_id: null,
          daily_windows: [],
          daily_winners: []
        }, null, 2))
        console.log('Frozen leaderboard snapshot saved')
      } catch (e) {
        console.error('Failed to save frozen snapshot:', e)
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching contest leaderboard:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
