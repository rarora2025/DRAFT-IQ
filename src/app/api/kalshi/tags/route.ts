import { NextResponse } from 'next/server'
import { kalshiClient } from '@/lib/kalshiClient'

export async function GET() {
  try {
    const tags = await kalshiClient.getTagsForSeriesCategories()
    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error fetching Kalshi tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}
