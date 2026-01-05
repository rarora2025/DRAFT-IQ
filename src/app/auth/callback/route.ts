import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
      }
    )
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let redirectUrl = `${origin}${next}`
      if (!isLocalEnv && forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`
      }

      // Create the redirect response
      const response = NextResponse.redirect(redirectUrl)
      
      // Copy cookies from cookieStore to the redirect response to ensure they are set
      // in the browser before the redirect happens. This is a common fix for Next.js 15
      // Route Handlers where cookies().set() might not be reflected in NextResponse.redirect()
      const allCookies = await cookieStore.getAll()
      allCookies.forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          expires: cookie.expires,
        })
      })

      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
