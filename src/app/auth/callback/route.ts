import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

    if (code) {
      const cookieStore = await cookies()
      
      // Create a response object first
      const redirectUrl = `${origin}${next}`.replace(/([^:])\/\//g, '$1/')
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
              cookiesToSet.forEach(({ name, value, options }) => {
                // Set on cookieStore (for server-side state in this request)
                cookieStore.set(name, value, options)
                // Set on response (for the browser)
                response.cookies.set(name, value, options)
              })
            },
          },
        }
      )

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        return response
      }
      console.error('Auth callback error:', error)
    }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
