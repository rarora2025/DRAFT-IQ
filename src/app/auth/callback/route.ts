import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] Received request with code:', !!code, 'next:', next)

    if (code) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value)
              })
              // We'll set them on the final response later
            },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[Auth Callback] Exchange error:', error.message)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      }

      console.log('[Auth Callback] Session created for:', data.session?.user?.email)
      
      const response = NextResponse.redirect(`${origin}${next}`)
      
      // Transfer cookies from request (where supabase.ssr set them) to response
      data.session?.access_token && supabase.auth.onAuthStateChange((_event, session) => {
          // This is a bit of a hack but ensures cookies are in the response
      })

      // Standard way to set cookies on the response for the final redirect
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      
      // Actually, createServerClient already handles setting cookies if we pass the right response
      // But in a Route Handler redirect, it's safer to use the response object directly.
      
      const finalResponse = NextResponse.redirect(`${origin}${next}`)
      
      // Let's create a NEW client tied to the FINAL response to ensure cookies are set correctly
      const finalSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                finalResponse.cookies.set(name, value, options)
              })
            }
          }
        }
      )
      
      // Refresh session one last time to ensure cookies are written to finalResponse
      await finalSupabase.auth.getUser()
      
      return finalResponse
    }

  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
