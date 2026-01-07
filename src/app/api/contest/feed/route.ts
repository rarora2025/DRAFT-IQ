import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')

    let query = supabase
      .from('contest_feed')
      .select(`
        id,
        user_id,
        type,
        content,
        trade_amount,
        parent_id,
        created_at
      `)
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: feedItems, error: feedError } = await query

    if (feedError) throw feedError

    const feedIds = (feedItems || []).map(f => f.id)
    const userIds = [...new Set((feedItems || []).map(f => f.user_id))]

    const { data: reactions } = await supabase
      .from('contest_feed_reactions')
      .select('id, feed_item_id, user_id, emoji')
      .in('feed_item_id', feedIds.length > 0 ? feedIds : ['none'])

    const { data: replies } = await supabase
      .from('contest_feed')
      .select('id, user_id, content, parent_id, created_at')
      .in('parent_id', feedIds.length > 0 ? feedIds : ['none'])
      .order('created_at', { ascending: true })

    const replyUserIds = (replies || []).map(r => r.user_id)
    const allUserIds = [...new Set([...userIds, ...replyUserIds])]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', allUserIds.length > 0 ? allUserIds : ['none'])

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const reactionsByItem = new Map<string, { emoji: string; count: number; user_ids: string[] }[]>()
    for (const r of reactions || []) {
      if (!reactionsByItem.has(r.feed_item_id)) {
        reactionsByItem.set(r.feed_item_id, [])
      }
      const existing = reactionsByItem.get(r.feed_item_id)!.find(e => e.emoji === r.emoji)
      if (existing) {
        existing.count++
        existing.user_ids.push(r.user_id)
      } else {
        reactionsByItem.get(r.feed_item_id)!.push({ emoji: r.emoji, count: 1, user_ids: [r.user_id] })
      }
    }

    const repliesByItem = new Map<string, typeof replies>()
    for (const r of replies || []) {
      if (!repliesByItem.has(r.parent_id!)) {
        repliesByItem.set(r.parent_id!, [])
      }
      repliesByItem.get(r.parent_id!)!.push(r)
    }

    const enrichedFeed = (feedItems || []).map(item => ({
      ...item,
      username: profileMap.get(item.user_id)?.username || 'Unknown',
      reactions: reactionsByItem.get(item.id) || [],
      replies: (repliesByItem.get(item.id) || []).map(r => ({
        ...r,
        username: profileMap.get(r.user_id)?.username || 'Unknown'
      }))
    }))

    return NextResponse.json({ 
      feed: enrichedFeed
    })
  } catch (error) {
    console.error('Error fetching contest feed:', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: participant } = await supabase
      .from('contest_participants')
      .select('id')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('user_id', user.id)
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Not enrolled in contest' }, { status: 403 })
    }

    const body = await request.json()
    const { type, content, parent_id, emoji, feed_item_id } = body

    if (type === 'reaction') {
      if (!feed_item_id || !emoji) {
        return NextResponse.json({ error: 'Missing feed_item_id or emoji' }, { status: 400 })
      }

      const { data: existing, error: fetchError } = await supabase
        .from('contest_feed_reactions')
        .select('id')
        .eq('feed_item_id', feed_item_id)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle()

      if (existing) {
        const { error: deleteError } = await supabase
          .from('contest_feed_reactions')
          .delete()
          .eq('id', existing.id)
        
        if (deleteError) throw deleteError
        return NextResponse.json({ success: true, action: 'removed' })
      }

      const { error: reactionError } = await supabase
        .from('contest_feed_reactions')
        .insert({
          feed_item_id,
          user_id: user.id,
          emoji
        })

      if (reactionError) {
        if (reactionError.code === '23505') {
          // If already exists, toggle off
          await supabase
            .from('contest_feed_reactions')
            .delete()
            .eq('feed_item_id', feed_item_id)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
          return NextResponse.json({ success: true, action: 'removed' })
        }
        throw reactionError
      }
      return NextResponse.json({ success: true, action: 'added' })
    }

    if (type === 'message') {
      if (!content || content.trim().length === 0) {
        return NextResponse.json({ error: 'Message content required' }, { status: 400 })
      }

      const { data: newItem, error: insertError } = await supabase
        .from('contest_feed')
        .insert({
          contest_id: NFL_PLAYOFF_CONTEST_ID,
          user_id: user.id,
          type: 'message',
          content: content.trim().substring(0, 500),
          parent_id: parent_id || null
        })
        .select()
        .single()

      if (insertError) throw insertError
      return NextResponse.json({ success: true, item: newItem })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error posting to contest feed:', error)
    return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  }
}
