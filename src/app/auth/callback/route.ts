import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            const host = request.headers.get('host') || ''
            const isProd = host.includes('draftiq.app')
            const domain = isProd ? '.draftiq.app' : undefined

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                path: '/',
                sameSite: 'lax',
                secure: true,
                ...(domain ? { domain } : {}),
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return response
  }

  const error_param = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  if (error_param) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error_param)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=No authorization code provided`)
}
