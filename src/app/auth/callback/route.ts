import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getURL } from '@/lib/utils'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'
  const origin = getURL()

  console.log('[Auth Callback] Received request:', {
    hasCode: !!code,
    error: error_param,
    error_description,
    origin,
    url: request.url
  })

  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}login?error=${encodeURIComponent(error_description || error_param)}`)
  }

  if (code) {
    const cookieStore = await cookies()
    const redirectUrl = `${origin}${next.startsWith('/') ? next.slice(1) : next}`
    
    console.log('[Auth Callback] Will redirect to:', redirectUrl)
    
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            console.log('[Auth Callback] Setting cookies:', cookiesToSet.map(c => c.name))
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Exchange error:', error.message, error)
      return NextResponse.redirect(`${origin}login?error=${encodeURIComponent(error.message)}`)
    }

    console.log('[Auth Callback] Session exchanged successfully for user:', data.user?.email)
    
    // Ensure the response has the cookies set by setAll
    return response
  }

  console.log('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}login?error=No authorization code provided`)
}
