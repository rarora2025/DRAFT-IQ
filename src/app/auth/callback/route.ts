import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/'

    if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host') // beetroot.dev
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        // Ensure next is a safe relative path or matching origin
        let redirectUrl = next
        if (next.startsWith('/')) {
          if (isLocalEnv) {
            redirectUrl = `${origin}${next}`
          } else if (forwardedHost) {
            redirectUrl = `https://${forwardedHost}${next}`
          } else {
            redirectUrl = `${origin}${next}`
          }
        }
        
        return NextResponse.redirect(redirectUrl)
      }
    }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
