import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/markets'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Use origin to ensure we redirect to the same domain
      const redirectUrl = next.startsWith('/') ? `${origin}${next}` : next
      return NextResponse.redirect(redirectUrl)
    }
    
    console.error('[Auth Callback] Error exchanging code for session:', error)
  }

  // If we're here, either code is missing or exchange failed
  // Return to login but preserve the next path if it's not the default
  const errorRedirectUrl = new URL(`${origin}/login`)
  errorRedirectUrl.searchParams.set('error', 'auth-code-error')
  if (next && next !== '/markets') {
    errorRedirectUrl.searchParams.set('redirectTo', next)
  }
  
  return NextResponse.redirect(errorRedirectUrl.toString())
}
