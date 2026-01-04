import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] Received request:', {
    hasCode: !!code,
    error: error_param,
    error_description,
    origin,
    url: request.url
  })

  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`)
  }

    if (code) {
      const cookieStore = await cookies()
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let redirectUrl: string
      if (isLocalEnv) {
        // Force port 3001 if we are in local dev and the origin is different
        const urlObj = new URL(origin)
        if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
            urlObj.port = '3001'
        }
        redirectUrl = `${urlObj.origin}${next}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      } else {
        redirectUrl = `${origin}${next}`
      }
      
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
                console.log('[Auth Callback] Setting cookies:', cookiesToSet.map(c => ({
                  name: c.name,
                  secure: c.options?.secure,
                  sameSite: c.options?.sameSite,
                  path: c.options?.path
                })))
                cookiesToSet.forEach(({ name, value, options }) => {
                  // For local development on http, we must ensure secure is false
                  const isLocal = redirectUrl.includes('localhost') || redirectUrl.includes('127.0.0.1')
                  const cookieOptions = { 
                    ...options, 
                    path: '/',
                    // Force secure false on localhost to allow cookies over http
                    secure: isLocal ? false : options?.secure,
                    sameSite: 'lax',
                    domain: undefined 
                  }
                  console.log(`[Auth Callback] Setting cookie ${name}`, {
                    secure: cookieOptions.secure,
                    sameSite: cookieOptions.sameSite,
                    path: cookieOptions.path
                  })
                  response.cookies.set(name, value, cookieOptions)
                })
              },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Exchange error:', error.message, error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log('[Auth Callback] Session exchanged successfully for user:', data.user?.email)
    return response
  }

  console.log('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
