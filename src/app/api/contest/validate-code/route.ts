import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim()

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Code is required' })
    }

    const supabase = getServiceRoleClient()
    
    const { data: validCode, error } = await supabase
      .from('join_codes')
      .select('code')
      .ilike('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !validCode) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true, code: validCode.code })
  } catch (error) {
    console.error('Error validating code:', error)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
