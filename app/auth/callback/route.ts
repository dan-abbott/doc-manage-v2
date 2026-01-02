import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No user found after auth')
      return NextResponse.redirect(`${origin}/`)
    }

    // Get subdomain from cookie (set by middleware)
    const subdomainCookie = cookieStore.get('tenant_subdomain')
    const subdomain = subdomainCookie?.value || 'app'

    console.log('Auth callback - subdomain:', subdomain, 'user:', user.email)

    // Look up tenant by subdomain
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    let tenantId = '00000000-0000-0000-0000-000000000001' // default

    if (tenantError || !tenant) {
      console.log('Tenant not found for subdomain:', subdomain, '- using default tenant')
    } else {
      console.log('Found tenant:', tenant.id, 'for subdomain:', subdomain)
      tenantId = tenant.id
    }

    // Update user's tenant_id in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ tenant_id: tenantId })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user tenant:', updateError)
    } else {
      console.log('User tenant updated successfully:', user.email, '→', tenantId)
    }

    // Redirect to dashboard (preserves subdomain from origin)
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // No code present, redirect to home
  return NextResponse.redirect(`${origin}/`)
}
