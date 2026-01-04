import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] Received:', { hasCode: !!code, error: error_param, origin })

  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`)
  }

    if (code) {
      const cookieStore = await cookies()
      const redirectToUrl = new URL(next, origin)
      const response = NextResponse.redirect(redirectToUrl.toString())
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  // Explicitly handle localhost cookie security
                  const cookieOptions = {
                    ...options,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax' as const,
                    path: '/',
                  }
                  
                  // Set on store for current request context
                  cookieStore.set(name, value, cookieOptions)
                  // Set on response for the redirect
                  response.cookies.set(name, value, cookieOptions)
                })
              } catch (e) {
                console.error('[Auth Callback] Failed to set cookies:', e)
              }
            },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[Auth Callback] Exchange error:', error.message)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      }

      console.log('[Auth Callback] Session created for:', data.user?.email)
      
      // Ensure the response with cookies is returned
      return response
    }

  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
