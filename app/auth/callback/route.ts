import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('[Auth Callback] START - origin:', origin, 'has code:', !!code)

  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Exchange code for session
    console.log('[Auth Callback] Exchanging code for session...')
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] Exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    console.log('[Auth Callback] Session established')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('[Auth Callback] No user found after auth')
      return NextResponse.redirect(`${origin}/`)
    }

    console.log('[Auth Callback] User:', user.email)

    // Get subdomain from cookie (set by middleware)
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value || 'app'

    console.log('[Auth Callback] Cookie subdomain:', subdomain)

    // Look up tenant by subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, company_name')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    let tenantId = '00000000-0000-0000-0000-000000000001' // default

    if (tenantError || !tenant) {
      console.log('[Auth Callback] Tenant not found for subdomain:', subdomain, '- using default')
    } else {
      console.log('[Auth Callback] Found tenant:', tenant.company_name, tenant.id)
      tenantId = tenant.id
    }

    // Update user's tenant_id in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ tenant_id: tenantId })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Auth Callback] Error updating user tenant:', updateError)
    } else {
      console.log('[Auth Callback] User tenant updated:', user.email, '→', tenantId)
    }

    // Redirect to dashboard (preserves subdomain from origin)
    const redirectUrl = `${origin}/dashboard`
    console.log('[Auth Callback] Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
  }

  // No code present, redirect to home
  console.log('[Auth Callback] No code - redirecting to home')
  return NextResponse.redirect(`${origin}/`)
}
