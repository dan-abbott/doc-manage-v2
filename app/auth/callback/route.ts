import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirect = requestUrl.searchParams.get('redirect')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      // Redirect to landing page with error
      return NextResponse.redirect(`${origin}/?error=auth_failed`)
    }

    if (!data.session) {
      console.error('No session created from code exchange')
      return NextResponse.redirect(`${origin}/?error=no_session`)
    }

    // Session successfully created - redirect to destination
    const destination = redirect || '/dashboard'
    
    // Use 302 redirect (temporary) to prevent caching
    return NextResponse.redirect(`${origin}${destination}`, { status: 302 })
  }

  // No code provided - redirect to landing page
  return NextResponse.redirect(`${origin}/`)
}
