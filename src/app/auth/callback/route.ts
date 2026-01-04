import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('[Auth Callback] Full URL:', request.url)
  console.log('[Auth Callback] Origin:', origin)
  console.log('[Auth Callback] Code present:', !!code)
  console.log('[Auth Callback] Next:', next)
  console.log('[Auth Callback] All params:', Object.fromEntries(searchParams.entries()))

  if (code) {
    const cookiesToSet: { name: string; value: string; options: any }[] = []
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookies = request.cookies.getAll()
            console.log('[Auth Callback] Existing cookies:', cookies.map(c => c.name))
            return cookies
          },
          setAll(cookies) {
            console.log('[Auth Callback] Setting cookies:', cookies.map(c => c.name))
            cookiesToSet.push(...cookies)
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
    console.log('[Auth Callback] Cookies to set count:', cookiesToSet.length)
    
      const redirectUrl = `${origin}${next}`
      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      
      const response = NextResponse.redirect(redirectUrl)
      
      // Get the domain for cookies to support both www and root domain
      const host = request.headers.get('host') || ''
      const isProd = host.includes('draftiq.app')
      const domain = isProd ? '.draftiq.app' : undefined

      cookiesToSet.forEach(({ name, value, options }) => {
        console.log('[Auth Callback] Setting cookie:', name, 'on domain:', domain)
        response.cookies.set(name, value, {
          ...options,
          path: '/',
          sameSite: 'lax',
          secure: true,
          ...(domain ? { domain } : {}),
        })
      })

      return response

  }

  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  if (error_param) {
    console.error('[Auth Callback] OAuth error:', error_param, error_description)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`)
  }

  console.error('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
