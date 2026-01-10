import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const NFL_PLAYOFF_CONTEST_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

interface TradeDetails {
  position_id: string
  player_name: string
  prop_type: string
  side: 'long' | 'short'
  entry_price: number
  current_price?: number
  exit_price?: number
  size: number
  pnl?: number
  pnl_percent?: number
  status: 'active' | 'closed'
  line?: number
  player_photo?: string
}

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
          trade_details,
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

      // Fetch player photos for trades
      const playerNames = [...new Set((feedItems || [])
        .filter(f => f.type === 'trade' && f.trade_details?.player_name)
        .map(f => f.trade_details!.player_name))]
      
      let playerPhotoMap = new Map<string, string>()
      if (playerNames.length > 0) {
        const { data: players } = await supabase
          .from('players')
          .select('name, photo_url')
          .in('name', playerNames)
        
        if (players) {
          players.forEach(p => {
            if (p.photo_url) playerPhotoMap.set(p.name, p.photo_url)
          })
        }
      }

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

    const enrichedFeed = (feedItems || []).map(item => {
      const details = item.trade_details as TradeDetails | null
      if (details && item.type === 'trade' && !details.player_photo) {
        const photo = playerPhotoMap.get(details.player_name)
        if (photo) details.player_photo = photo
      }
      return {
        ...item,
        username: profileMap.get(item.user_id)?.username || 'Unknown',
        reactions: reactionsByItem.get(item.id) || [],
        replies: (repliesByItem.get(item.id) || []).map(r => ({
          ...r,
          username: profileMap.get(r.user_id)?.username || 'Unknown'
        }))
      }
    })

    return NextResponse.json({ 
      feed: enrichedFeed
    })
  } catch (error: any) {
    console.error('Error fetching contest feed:', error?.message || error, error?.stack)
    return NextResponse.json({ error: 'Failed to fetch feed', details: error?.message }, { status: 500 })
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
      .select('id, username')
      .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
      .eq('user_id', user.id)
      .maybeSingle()

    const admins = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
    const isAdmin = admins.includes(user.id)

    if (!participant && !isAdmin) {
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

          const isEveryoneMentioned = content.includes('@everyone')
          const admins = process.env.ADMIN_USER_ID?.split(',') || []
          const isAdmin = admins.includes(user.id)

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

            // If @everyone is mentioned by an admin, trigger notifications
            if (isEveryoneMentioned && isAdmin) {
               try {
                 const { data: participants } = await supabase
                   .from('contest_participants')
                   .select('user_id')
                   .eq('contest_id', NFL_PLAYOFF_CONTEST_ID)
                   .neq('user_id', user.id)

                  if (participants && participants.length > 0) {
                    const senderName = participant?.username || 'Admin'
                    const notifications = participants.map(p => ({
                      user_id: p.user_id,
                      sender_id: user.id,
                      type: 'announcement',
                      title: 'New Announcement',
                      message: `@${senderName} mentioned everyone: ${content.substring(0, 50)}...`,
                      link: '/feed'
                    }))
                   
                   await supabase.from('notifications').insert(notifications)
                 }
               } catch (notifyError) {
                 console.error('Error triggering everyone notifications:', notifyError)
               }
            } else {
              // Handle individual mentions
                const mentions = content.match(/@(\w+)/g)
                if (mentions) {
                  const usernames = mentions.map((m: string) => m.substring(1))
                try {
                  const { data: mentionedUsers } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('username', usernames)
                  
                  if (mentionedUsers && mentionedUsers.length > 0) {
                      const mentionSenderName = participant?.username || 'User'
                      const notifications = mentionedUsers
                        .filter(u => u.id !== user.id)
                        .map(u => ({
                          user_id: u.id,
                          sender_id: user.id,
                          type: 'mention',
                          title: 'New Mention',
                          message: `@${mentionSenderName} mentioned you in the feed`,
                          link: '/feed'
                        }))
                    
                    if (notifications.length > 0) {
                      await supabase.from('notifications').insert(notifications)
                    }
                  }
                } catch (mentionError) {
                  console.error('Error triggering mention notifications:', mentionError)
                }
              }
            }

            // Handle reply notification
            if (parent_id) {
              try {
                const { data: parentMsg } = await supabase
                  .from('contest_feed')
                  .select('user_id')
                  .eq('id', parent_id)
                  .single()
                
                if (parentMsg && parentMsg.user_id !== user.id) {
                    const replySenderName = participant?.username || 'User'
                    await supabase.from('notifications').insert({
                      user_id: parentMsg.user_id,
                      sender_id: user.id,
                      type: 'reply',
                      title: 'New Reply',
                      message: `@${replySenderName} replied to your message`,
                      link: '/feed'
                    })
                }
              } catch (replyNotifyError) {
                console.error('Error triggering reply notification:', replyNotifyError)
              }
            }


          return NextResponse.json({ success: true, item: newItem })
        }

      if (type === 'share_trade') {
        const { position_id, caption } = body
        if (!position_id) {
          return NextResponse.json({ error: 'Position ID required' }, { status: 400 })
        }

        const { data: position, error: posError } = await supabase
          .from('positions')
          .select(`
            id,
            side,
            size,
            entry_price,
            exit_price,
            realized_pnl,
            closed_at,
            market_title,
            player_prop_id,
            quantity
          `)
          .eq('id', position_id)
          .eq('user_id', user.id)
          .single()

        if (posError || !position) {
          return NextResponse.json({ error: 'Position not found' }, { status: 404 })
        }

        let playerName = 'Unknown Player'
        let playerPhoto = ''
        let propType = ''
        let line = 0
        let currentPrice = position.entry_price

        if (position.player_prop_id) {
          const { data: prop } = await supabase
            .from('player_props')
            .select(`
              prop_type,
              line,
              current_value,
              player_id
            `)
            .eq('id', position.player_prop_id)
            .single()

          if (prop) {
            propType = prop.prop_type || ''
            line = prop.line || 0
            currentPrice = prop.current_value || position.entry_price

            const { data: player } = await supabase
              .from('players')
              .select('name, photo_url')
              .eq('id', prop.player_id)
              .single()

            if (player) {
              playerName = player.name
              playerPhoto = player.photo_url || ''
            }
          }
        }

        const isClosed = !!position.closed_at
        const exitPrice = position.exit_price || currentPrice
        const entryPrice = position.entry_price || 50

        let pnl = 0
        let pnlPercent = 0
        if (isClosed && position.realized_pnl !== null) {
          pnl = Number(position.realized_pnl)
        } else {
          const priceChange = exitPrice - entryPrice
          const direction = position.side === 'long' ? 1 : -1
          pnl = priceChange * direction * (position.quantity || 1)
        }
        const cost = entryPrice * (position.quantity || 1)
        pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0

        const tradeDetails: TradeDetails = {
          position_id: position.id,
          player_name: playerName,
          player_photo: playerPhoto,
          prop_type: propType,
          side: position.side as 'long' | 'short',
          entry_price: entryPrice,
          current_price: isClosed ? undefined : currentPrice,
          exit_price: isClosed ? exitPrice : undefined,
          size: position.size || position.quantity || 1,
          pnl: pnl,
          pnl_percent: pnlPercent,
          status: isClosed ? 'closed' : 'active',
          line: line
        }

        const { data: newItem, error: insertError } = await supabase
          .from('contest_feed')
          .insert({
            contest_id: NFL_PLAYOFF_CONTEST_ID,
            user_id: user.id,
            type: 'trade',
            content: caption?.trim().substring(0, 200) || null,
            trade_amount: position.size || position.quantity || 1,
            trade_details: tradeDetails,
            parent_id: null
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing message ID' }, { status: 400 })
    }

    // Verify ownership
    const { data: message, error: fetchError } = await supabase
      .from('contest_feed')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.user_id !== user.id) {
      const admins = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
      if (!admins.includes(user.id)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Delete reactions first if they are not cascaded (assuming they might not be)
    await supabase
      .from('contest_feed_reactions')
      .delete()
      .eq('feed_item_id', id)

    // Delete replies if any
    await supabase
      .from('contest_feed')
      .delete()
      .eq('parent_id', id)

    // Delete the message itself
    const { error: deleteError } = await supabase
      .from('contest_feed')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getServiceRoleClient()
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admins = process.env.ADMIN_USER_ID?.split(',').map(id => id.trim()) || []
    if (!admins.includes(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, id } = body

    if (type === 'pin') {
      return NextResponse.json({ error: 'Pinning is currently disabled' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
