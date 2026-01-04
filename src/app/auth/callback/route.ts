import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  const redirectUrl = `${origin}${next}`.replace(/([^:])\/\//g, '$1/')
  
  if (code) {
    const cookieStore = await cookies()
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies)
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const response = NextResponse.redirect(redirectUrl)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
    console.error('Auth callback error:', error)
  }

  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
