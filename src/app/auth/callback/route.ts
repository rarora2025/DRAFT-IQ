import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Use the origin from the request to build the absolute redirect URL
      // If next is already an absolute URL, new URL(next, origin) will just return next
      const redirectUrl = new URL(next, requestUrl.origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If there's an error, redirect to login with the error code and the next param
  const errorUrl = new URL('/login', requestUrl.origin)
  errorUrl.searchParams.set('error', 'auth-code-error')
  if (next !== '/') {
    errorUrl.searchParams.set('redirectTo', next)
  }
  return NextResponse.redirect(errorUrl)
}
