import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
              supabaseResponse.cookies.set(name, value, options)
            })
          },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  
  const protectedPaths = ['/portfolio', '/community', '/markets']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

    if (isProtectedPath && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      
      // Create a new response for the redirect
      const redirectResponse = NextResponse.redirect(url)
      
      // Copy the cookies from the supabaseResponse to the redirectResponse
      // This is CRITICAL to ensure the session/refresh token is preserved
      // We must copy both name/value and options (path, domain, etc.)
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          expires: cookie.expires,
        })
      })
      
      return redirectResponse
    }


  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
